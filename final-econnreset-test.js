const fs = require('fs');

// Create a test file with emails that are likely to cause ECONNRESET errors
const testEmails = [
  // Valid emails
  'test@gmail.com',
  'user@yahoo.com',
  
  // Invalid format emails
  'invalid-email',
  'not-an-email@',
  
  // Disposable emails
  'temp@10minutemail.com',
  
  // Emails that are likely to cause ECONNRESET
  'nonexistent@nonexistentdomain12345.com',
  'bad@serverwithnetworkissues.com',
  'test@invalidserverthatwillreset.com'
];

// Create JSON file for testing ECONNRESET handling
const bulkData = {
  emails: testEmails,
  options: {
    skip_smtp: false // Make sure we test SMTP connections
  }
};

fs.writeFileSync('final-econnreset-test-bulk.json', JSON.stringify(bulkData, null, 2));

console.log(`Generated ${testEmails.length} test emails for final ECONNRESET testing.`);
console.log('File created: final-econnreset-test-bulk.json');
console.log('\nTo test the ECONNRESET handling:');
console.log('1. Run: curl -X POST http://localhost:3000/v1/validate/bulk -H "Content-Type: application/json" -d @final-econnreset-test-bulk.json');
console.log('2. Monitor the application logs for proper ECONNRESET error handling');
console.log('3. Verify that the application does not crash and continues processing');
console.log('4. Check job status and results to see proper error reporting');
console.log('\nThe application should now handle ECONNRESET errors gracefully without crashing.');
console.log('Even if some SMTP connections fail, the validation job should complete successfully.');