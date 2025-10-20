const fetch = require('node-fetch');

async function testAPI() {
  const baseURL = 'http://localhost:3000';
  
  console.log('Testing single email validation...');
  
  try {
    // Test single email validation
    const singleResponse = await fetch(`${baseURL}/v1/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'support@google.com'
      })
    });
    
    const singleResult = await singleResponse.json();
    console.log('Single validation result:', JSON.stringify(singleResult, null, 2));
    
    // Test bulk email validation with normal amount
    console.log('\nTesting bulk email validation with normal amount...');
    const bulkResponse = await fetch(`${baseURL}/v1/validate/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emails: [
          'support@google.com',
          'invalid-email',
          'test@mailinator.com'
        ]
      })
    });
    
    const bulkResult = await bulkResponse.json();
    console.log('Bulk validation result:', JSON.stringify(bulkResult, null, 2));
    
    // Test bulk email validation limit (should fail with 100,001 emails)
    console.log('\nTesting bulk email validation limit...');
    const largeEmailArray = Array(100001).fill('test@example.com');
    const limitResponse = await fetch(`${baseURL}/v1/validate/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emails: largeEmailArray
      })
    });
    
    console.log('Limit test response status:', limitResponse.status);
    const limitResult = await limitResponse.json();
    console.log('Limit test result:', JSON.stringify(limitResult, null, 2));
    
    // If we have a job ID from normal bulk test, check the job status
    if (bulkResult.jobId) {
      console.log('\nChecking job status...');
      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const jobResponse = await fetch(`${baseURL}/v1/jobs/${bulkResult.jobId}`);
      const jobResult = await jobResponse.json();
      console.log('Job status:', JSON.stringify(jobResult, null, 2));
      
      console.log('\nGetting job results...');
      const resultsResponse = await fetch(`${baseURL}/v1/jobs/${bulkResult.jobId}/results`);
      const resultsResult = await resultsResponse.json();
      console.log('Job results:', JSON.stringify(resultsResult, null, 2));
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();