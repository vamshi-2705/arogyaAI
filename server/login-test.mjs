// Test nurse login API
const res = await fetch('http://localhost:5000/api/nurse/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'nurse@demo.com', password: 'password123' }),
});
const data = await res.json();
console.log('Status:', res.status);
console.log('Response:', JSON.stringify(data, null, 2));
