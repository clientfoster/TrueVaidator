const fs = require('fs');

// Create a final comprehensive test file with various types of emails
const testEmails = [
  // Valid emails that should work
  'test@gmail.com',
  'user@yahoo.com',
  'example@outlook.com',
  
  // Invalid format emails
  'invalid-email',
  'not-an-email@',
  '@missing-domain.com',
  
  // Disposable emails
  'temp@10minutemail.com',
  'test@mailinator.com',
  
  // Emails that are likely to cause ECONNRESET or other network issues
  'nonexistent@nonexistentdomain12345.com',
  'bad@serverwithnetworkissues.com',
  'test@invalidserverthatwillreset.com',
  'user@serverwithconnectionproblems.com',
  'fake@serverthatdoesnotexist12345.com',
  
  // Role accounts
  'admin@company.com',
  'sales@business.org',
  
  // Additional emails that might cause network issues
  'user@serverwithtimeout.com',
  'test@unreachabledomain.com'
];

// Create JSON file for final comprehensive ECONNRESET handling test
const bulkData = {
  emails: testEmails,
  options: {
    skip_smtp: false // Make sure we test SMTP connections
  }
};

fs.writeFileSync('final-comprehensive-econnreset-test-bulk.json', JSON.stringify(bulkData, null, 2));

console.log(`Generated ${testEmails.length} test emails for final comprehensive ECONNRESET testing.`);
console.log('File created: final-comprehensive-econnreset-test-bulk.json');
console.log('\nTo test the ECONNRESET handling:');
console.log('1. Run: curl -X POST http://localhost:3000/v1/validate/bulk -H "Content-Type: application/json" -d @final-comprehensive-econnreset-test-bulk.json');
console.log('2. Monitor the application logs for proper ECONNRESET error handling');
console.log('3. Verify that the application does not crash and continues processing');
console.log('4. Check job status and results to see proper error reporting');
console.log('\nThe application should now handle ECONNRESET errors gracefully without crashing.');
console.log('All validation jobs should complete successfully, even if some SMTP connections fail.');
console.log('\nExpected behavior:');
console.log('- Valid emails should be validated properly');
console.log('- Invalid format emails should be caught at syntax check');
console.log('- Disposable emails should be detected');
console.log('- Network errors should be caught and reported without crashing the application');
console.log('- All results should be returned in the final job results');
console.log('- The application should remain stable throughout the entire process');
console.log('\nThis is the final and most comprehensive fix for ECONNRESET errors in the email validation system.');