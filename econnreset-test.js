const fs = require('fs');

// Create a test file with emails that are likely to cause ECONNRESET errors
// These are known problematic domains or invalid formats that might trigger network errors
const testEmails = [
  // Valid format but likely to cause connection issues
  'test@nonexistentdomainthatdoesnotexist12345.com',
  'user@invalidserverthatwillresetconnection.com',
  'bad@serverwithnetworkissues.com',
  
  // Some valid emails for comparison
  'test@gmail.com',
  'user@yahoo.com',
  'example@outlook.com',
  
  // Invalid formats
  'invalid-email',
  'not-an-email@',
  '@missing-domain.com',
  
  // Disposable emails
  'temp@10minutemail.com',
  'test@mailinator.com'
];

// Create JSON file for testing ECONNRESET handling
const bulkData = {
  emails: testEmails,
  options: {
    skip_smtp: false // Make sure we test SMTP connections
  }
};

fs.writeFileSync('econnreset-test-bulk.json', JSON.stringify(bulkData, null, 2));

console.log(`Generated ${testEmails.length} test emails for ECONNRESET testing.`);
console.log('File created: econnreset-test-bulk.json');
console.log('\nTo test the ECONNRESET handling:');
console.log('1. Send a POST request to /v1/validate/bulk with this JSON data');
console.log('2. Monitor the application logs for ECONNRESET error handling');
console.log('3. Verify that the application does not crash and continues processing');
console.log('4. Check job status and results to see proper error reporting');