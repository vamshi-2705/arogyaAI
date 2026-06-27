// Check different DNS records and wildcard patterns for Supabase
const tests = [
  'yrbcsciqtnmxfquvamm.supabase.co',
  'db.yrbcsciqtnmxfquvamm.supabase.co',
  '*.supabase.co',
  'supabase.co',
  'api.supabase.com',
];

for (const host of tests) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${host}&type=A`);
    const data = await res.json();
    const ip = data.Answer?.find(a => a.type === 1)?.data;
    const cname = data.Answer?.find(a => a.type === 5)?.data;
    console.log(`${host}: Status=${data.Status} IP=${ip || 'none'} CNAME=${cname || 'none'}`);
  } catch (e) {
    console.log(`${host}: ERROR ${e.message}`);
  }
}
