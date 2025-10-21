const fs = require('fs');

// Generate a larger set of test emails to demonstrate parallel processing
const domains = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
  'example.com', 'test.com', 'mail.com', 'company.com'
];

const names = [
  'john', 'jane', 'mike', 'sarah', 'david', 'lisa', 
  'robert', 'emily', 'michael', 'jennifer', 'william', 
  'elizabeth', 'james', 'mary', 'thomas', 'patricia',
  'charles', 'barbara', 'daniel', 'susan', 'matthew'
];

// Generate 200 test emails for performance testing
const emails = [];
for (let i = 0; i < 200; i++) {
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

fs.writeFileSync('test-parallel-bulk.json', JSON.stringify(bulkData, null, 2));

console.log(`Generated ${emails.length} test emails for parallel processing test.`);
console.log('File created: test-parallel-bulk.json');
console.log('\nTo test the parallel processing:');
console.log('1. Run: curl -X POST http://localhost:3000/v1/validate/bulk -H "Content-Type: application/json" -d @test-parallel-bulk.json');
console.log('2. Monitor the logs to see the improved parallel processing');
console.log('3. Compare processing time with previous versions');