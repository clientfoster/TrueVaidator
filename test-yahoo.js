const { validateEmail } = require('./validator');

async function testYahooEmail() {
  console.log('Testing Yahoo email validation...\n');
  
  const yahooEmails = [
    'b.anand9398@yahoo.com',
    'user@yahoo.co.uk',
    'sample@yahoo.fr',
    'example@ymail.com'
  ];
  
  for (const email of yahooEmails) {
    console.log(`\n--- Validating: ${email} ---`);
    try {
      const result = await validateEmail(email, { skip_smtp: false });
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }
  }
  
  console.log('\n\n--- Testing with SMTP skipped ---');
  for (const email of yahooEmails.slice(0, 2)) {
    console.log(`\n--- Validating: ${email} (skip SMTP) ---`);
    try {
      const result = await validateEmail(email, { skip_smtp: true });
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

testYahooEmail()
  .then(() => {
    console.log('\n\nTest completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
