const fs = require('fs');
const path = require('path');

// Create a test CSV file
const testCsvContent = `email,name,company
john@example.com,John Doe,Example Inc
jane@test.com,Jane Smith,Test Corp
invalid-email,Invalid Person,No Company
`;

fs.writeFileSync('test-input.csv', testCsvContent);

console.log('Created test CSV file: test-input.csv');
console.log('You can now test the CSV upload functionality with this file.');
console.log('After processing, check the /v1/jobs/{jobId}/results/csv endpoint to download the results.');