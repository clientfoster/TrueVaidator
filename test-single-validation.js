// Test single email validation
const testData = {
  email: "test@gmail.com"
};

console.log('To test single email validation:');
console.log('Run: curl -X POST http://localhost:3000/v1/validate -H "Content-Type: application/json" -d \'{"email": "test@gmail.com"}\'');
console.log('\nOr use this JSON data in your request:');
console.log(JSON.stringify(testData, null, 2));