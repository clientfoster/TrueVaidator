const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

async function testCSVUpload() {
  const baseURL = 'http://localhost:3000';
  
  console.log('Testing CSV upload for email validation...');
  
  try {
    // Create FormData
    const form = new FormData();
    form.append('csvFile', fs.createReadStream(path.join(__dirname, 'sample_emails.csv')));
    form.append('emailColumn', 'email');
    form.append('options', JSON.stringify({ skip_smtp: false }));
    
    // Test CSV upload
    const response = await fetch(`${baseURL}/v1/validate/bulk/csv`, {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    console.log('CSV upload result:', JSON.stringify(result, null, 2));
    
    // If we have a job ID, check the job status
    if (result.jobId) {
      console.log('\nChecking job status...');
      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const jobResponse = await fetch(`${baseURL}/v1/jobs/${result.jobId}`);
      const jobResult = await jobResponse.json();
      console.log('Job status:', JSON.stringify(jobResult, null, 2));
      
      // If job is completed, get results
      if (jobResult.status === 'completed') {
        console.log('\nGetting job results...');
        const resultsResponse = await fetch(`${baseURL}/v1/jobs/${result.jobId}/results`);
        const resultsResult = await resultsResponse.json();
        console.log('Job results:', JSON.stringify(resultsResult, null, 2));
        
        console.log('\nDownloading CSV results...');
        const csvResponse = await fetch(`${baseURL}/v1/jobs/${result.jobId}/results/csv`);
        const csvBuffer = await csvResponse.buffer();
        fs.writeFileSync('test_output.csv', csvBuffer);
        console.log('CSV results saved to test_output.csv');
      }
    }
  } catch (error) {
    console.error('Error testing CSV upload:', error);
  }
}

testCSVUpload();