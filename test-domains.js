const { validateEmail } = require('./validator');

async function testMultipleDomains() {
  console.log('Testing multiple email providers...\n');
  
  const testEmails = [
    'basumgarianand109@gmail.com',
    'user@outlook.com',
    'sample@hotmail.com',
    'tdtdrtjdrjdrj@yahoo.com',
    'test@aol.com',
    'b.anand9398@yahoo.com'
  ];
  
  for (const email of testEmails) {
    console.log(`\n--- Validating: ${email} ---`);
    try {
      const result = await validateEmail(email, { skip_smtp: false });
      console.log(`Status: ${result.status}`);
      console.log(`Score: ${result.score}`);
      console.log(`MX Records: ${result.mx.length > 0 ? 'Found' : 'Not found'}`);
      console.log(`SMTP: ${result.smtp ? (result.smtp.skipped ? 'Skipped (auto)' : result.smtp.ok ? 'Verified' : 'Failed') : 'Not performed'}`);
      if (result.smtp && result.smtp.reason) {
        console.log(`Reason: ${result.smtp.reason}`);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

testMultipleDomains()
  .then(() => {
    console.log('\n\nTest completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
