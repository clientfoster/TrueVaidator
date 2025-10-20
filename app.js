const express = require('express');
const { validateEmail } = require('./validator');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { Parser } = require('json2csv');

const app = express();
// Increase the request size limit to handle large bulk email requests
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Set up multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Get instance ID from environment variable
const instanceId = process.env.INSTANCE_ID || 'default';

// In-memory storage for jobs (in production, use a database)
const jobs = new Map();

// Add instance information to logs
console.log(`Email Validation API instance ${instanceId} starting...`);

// Single email validation endpoint
app.post('/v1/validate', async (req, res) => {
  const { email, options } = req.body;
  try {
    const result = await validateEmail(email, options || {});
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk email validation endpoint
app.post('/v1/validate/bulk', async (req, res) => {
  const { emails, options } = req.body;
  
  if (!emails || !Array.isArray(emails)) {
    return res.status(400).json({ error: 'emails array is required' });
  }
  
  // Limit to 100,000 emails per request
  if (emails.length > 100000) {
    return res.status(400).json({ error: 'Maximum 100,000 emails allowed per request' });
  }
  
  // Create a job ID
  const jobId = uuidv4();
  
  // Initialize job
  const job = {
    id: jobId,
    status: 'queued',
    total: emails.length,
    completed: 0,
    results: [],
    createdAt: new Date(),
    finishedAt: null
  };
  
  jobs.set(jobId, job);
  
  console.log(`Instance ${instanceId}: Processing bulk job ${jobId} with ${emails.length} emails`);
  
  // Start processing in background
  processBulkJob(jobId, emails, options || {});
  
  res.json({ jobId, status: 'queued' });
});

// CSV upload endpoint for bulk validation
app.post('/v1/validate/bulk/csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    const options = req.body.options ? JSON.parse(req.body.options) : {};
    const emailColumn = req.body.emailColumn || 'email';
    
    const emails = [];
    const rowData = [];
    
    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          if (row[emailColumn]) {
            emails.push(row[emailColumn]);
            rowData.push(row);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
    // Limit to 100,000 emails per request
    if (emails.length > 100000) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Maximum 100,000 emails allowed per request' });
    }
    
    if (emails.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'No emails found in the specified column' });
    }
    
    // Create a job ID
    const jobId = uuidv4();
    
    // Initialize job
    const job = {
      id: jobId,
      status: 'queued',
      total: emails.length,
      completed: 0,
      results: [],
      rowData: rowData, // Store original row data for CSV output
      emailColumn: emailColumn, // Store email column name
      createdAt: new Date(),
      finishedAt: null
    };
    
    jobs.set(jobId, job);
    
    console.log(`Instance ${instanceId}: Processing CSV bulk job ${jobId} with ${emails.length} emails`);
    
    // Start processing in background
    processBulkJobWithCSV(jobId, emails, rowData, emailColumn, options || {});
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ jobId, status: 'queued' });
  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Get job status
app.get('/v1/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json({
    id: job.id,
    status: job.status,
    total: job.total,
    completed: job.completed,
    createdAt: job.createdAt,
    finishedAt: job.finishedAt
  });
});

// Get job results as JSON
app.get('/v1/jobs/:jobId/results', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json({
    jobId: job.id,
    results: job.results
  });
});

// Get job results as CSV
app.get('/v1/jobs/:jobId/results/csv', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  if (job.status !== 'completed') {
    return res.status(400).json({ error: 'Job is not completed yet' });
  }
  
  try {
    // Combine original row data with validation results
    const csvData = job.rowData.map((row, index) => {
      const result = job.results[index] || {};
      return {
        ...row,
        validation_status: result.status || 'unknown',
        validation_score: result.score || 0,
        is_syntax_valid: result.syntax || false,
        is_disposable: result.disposable || false,
        is_role_account: result.role || false,
        mx_records: result.mx ? result.mx.join(';') : '',
        smtp_check: result.smtp ? (result.smtp.ok ? 'passed' : 'failed') : 'not_performed'
      };
    });
    
    // Create CSV
    const json2csvParser = new Parser();
    const csvOutput = json2csvParser.parse(csvData);
    
    // Set headers for file download
    res.header('Content-Type', 'text/csv');
    res.attachment(`validation_results_${jobId}.csv`);
    res.send(csvOutput);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate CSV output' });
  }
});

// Process bulk job (simulated async processing)
async function processBulkJob(jobId, emails, options) {
  const job = jobs.get(jobId);
  job.status = 'running';
  
  console.log(`Instance ${instanceId}: Starting processing of job ${jobId}`);
  
  // Process each email
  for (const email of emails) {
    try {
      const result = await validateEmail(email, options);
      job.results.push(result);
    } catch (error) {
      job.results.push({
        email,
        error: error.message
      });
    }
    
    job.completed++;
    
    // Log progress every 1000 emails
    if (job.completed % 1000 === 0) {
      console.log(`Instance ${instanceId}: Job ${jobId} progress: ${job.completed}/${job.total}`);
    }
  }
  
  job.status = 'completed';
  job.finishedAt = new Date();
  jobs.set(jobId, job);
  
  console.log(`Instance ${instanceId}: Completed processing of job ${jobId}`);
}

// Process bulk job with CSV data
async function processBulkJobWithCSV(jobId, emails, rowData, emailColumn, options) {
  const job = jobs.get(jobId);
  job.status = 'running';
  
  console.log(`Instance ${instanceId}: Starting processing of CSV job ${jobId}`);
  
  // Process each email
  for (const email of emails) {
    try {
      const result = await validateEmail(email, options);
      job.results.push(result);
    } catch (error) {
      job.results.push({
        email,
        error: error.message
      });
    }
    
    job.completed++;
    
    // Log progress every 1000 emails
    if (job.completed % 1000 === 0) {
      console.log(`Instance ${instanceId}: Job ${jobId} progress: ${job.completed}/${job.total}`);
    }
  }
  
  job.status = 'completed';
  job.finishedAt = new Date();
  jobs.set(jobId, job);
  
  console.log(`Instance ${instanceId}: Completed processing of CSV job ${jobId}`);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    instance: instanceId,
    timestamp: new Date(),
    activeJobs: Array.from(jobs.values()).filter(job => job.status === 'running').length
  });
});

// Admin dashboard endpoints
app.get('/api/stats', (req, res) => {
  const stats = {
    totalJobs: jobs.size,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    instance: instanceId
  };
  
  jobs.forEach(job => {
    switch(job.status) {
      case 'running':
        stats.activeJobs++;
        break;
      case 'completed':
        stats.completedJobs++;
        break;
      case 'failed':
        stats.failedJobs++;
        break;
    }
  });
  
  res.json(stats);
});

app.get('/api/jobs', (req, res) => {
  // Convert jobs map to array
  const jobsArray = Array.from(jobs.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 1000); // Increased limit to 1000 most recent jobs
  
  res.json(jobsArray);
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Email Validation API instance ${instanceId} listening on port ${PORT}`));

module.exports = app;