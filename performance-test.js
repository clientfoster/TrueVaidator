const fs = require('fs');

// Generate a list of test emails for performance testing
const domains = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
  'example.com', 'test.com', 'mail.com', 'company.com'
];

const names = [
  'john', 'jane', 'mike', 'sarah', 'david', 'lisa', 
  'robert', 'emily', 'michael', 'jennifer', 'william', 
  'elizabeth', 'james', 'mary', 'thomas', 'patricia'
];

// Generate 1000 test emails
const emails = [];
for (let i = 0; i < 1000; i++) {
  const name = names[Math.floor(Math.random() * names.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const number = Math.floor(Math.random() * 1000);
  emails.push(`${name}${number}@${domain}`);
}

// Add some invalid emails
emails.push('invalid-email', 'not-an-email', 'bad@format');

// Add some disposable emails
emails.push('test@10minutemail.com', 'user@mailinator.com');

// Create JSON file for bulk validation
const bulkData = {
  emails: emails
};

fs.writeFileSync('performance-test-bulk.json', JSON.stringify(bulkData, null, 2));

console.log(`Generated ${emails.length} test emails for performance testing.`);
console.log('File created: performance-test-bulk.json');
console.log('\nTo test the performance improvements:');
console.log('1. Use the POST /v1/validate/bulk endpoint with this JSON data');
console.log('2. Check the job status with GET /v1/jobs/{jobId}');
console.log('3. Compare processing time with previous versions');