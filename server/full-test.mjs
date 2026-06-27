// Full end-to-end API test
console.log('=== AROGYA WATCH AI — Full API Test ===\n');

// 1. Health check
const health = await fetch('http://localhost:5000/health');
const healthData = await health.json();
console.log('1. Health:', healthData.status === 'ok' ? '✅ OK' : '❌ FAIL');

// 2. Nurse login
const loginRes = await fetch('http://localhost:5000/api/nurse/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'nurse@demo.com', password: 'password123' }),
});
const loginData = await loginRes.json();
const token = loginData.token;
console.log('2. Nurse Login:', loginRes.status === 200 ? `✅ JWT issued for ${loginData.nurse?.name}` : `❌ ${loginData.error}`);

// 3. Nurse dashboard
const dashRes = await fetch('http://localhost:5000/api/nurse/dashboard', {
  headers: { Authorization: `Bearer ${token}` },
});
const dashData = await dashRes.json();
console.log('3. Dashboard:', dashRes.status === 200 ? `✅ Loaded (${dashData.patients?.length || 0} patients)` : `❌ ${dashData.error}`);

// 4. Create patient session
const sessionRes = await fetch('http://localhost:5000/api/patient/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hospitalId: '00000000-0000-0000-0000-000000000001',
    language: 'en',
    patientName: 'Test Patient',
  }),
});
const sessionData = await sessionRes.json();
const sessionId = sessionData.sessionId;
console.log('4. Patient Session:', sessionRes.status === 200 ? `✅ Created session ${sessionId?.slice(0,8)}...` : `❌ ${JSON.stringify(sessionData)}`);

// 5. Send first message (triggers GREETER)
if (sessionId) {
  const msgRes = await fetch('http://localhost:5000/api/patient/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message: 'Hello, I need help',
    }),
  });
  const msgData = await msgRes.json();
  console.log('5. GREETER Response:', msgRes.status === 200 ? `✅ "${msgData.reply?.slice(0,80)}..."` : `❌ ${JSON.stringify(msgData)}`);
}

// 6. QR code
const qrRes = await fetch(`http://localhost:5000/api/qr/00000000-0000-0000-0000-000000000001`, {
  headers: { Authorization: `Bearer ${token}` },
});
const qrData = await qrRes.json();
console.log('6. QR Code:', qrRes.status === 200 ? '✅ Generated' : `❌ ${JSON.stringify(qrData)}`);

console.log('\n=== Done ===');
