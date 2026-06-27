import dns from 'dns/promises';
import https from 'https';

console.log('Testing DNS...');
try {
  const addr = await dns.lookup('yrbcsciqtnmxfquvamm.supabase.co');
  console.log('✅ DNS resolved:', addr.address);
} catch (e) {
  console.log('❌ DNS failed:', e.message);
}

console.log('\nTesting HTTPS fetch...');
try {
  const res = await fetch('https://yrbcsciqtnmxfquvamm.supabase.co/rest/v1/', {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test' }
  });
  console.log('✅ HTTPS status:', res.status);
} catch (e) {
  console.log('❌ HTTPS fetch failed:', e.message, e.cause?.message || '');
}

console.log('\nTesting google.com reachability...');
try {
  const res = await fetch('https://www.google.com');
  console.log('✅ google.com status:', res.status);
} catch (e) {
  console.log('❌ google.com failed:', e.message);
}
