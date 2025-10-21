const fs = require('fs');

// Create a simple test file with a few emails to validate
const testEmails = [
  'test@gmail.com',
  'invalid-email',
  'user@yahoo.com',
  'bad@10minutemail.com'
];

// Create JSON file for testing
const bulkData = {
  emails: testEmails
};

fs.writeFileSync('test-validation-bulk.json', JSON.stringify(bulkData, null, 2));

console.log('Created test file: test-validation-bulk.json');
console.log('\nTo test the validation:');
console.log('1. Run: curl -X POST http://localhost:3000/v1/validate/bulk -H "Content-Type: application/json" -d @test-validation-bulk.json');
console.log('2. Or use a tool like Postman to send a POST request to http://localhost:3000/v1/validate/bulk with the JSON data');
console.log('3. Check the response for a jobId, then use that to check status and results');