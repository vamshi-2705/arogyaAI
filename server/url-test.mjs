import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Test multiple possible URL formats for new Supabase projects
const ref = 'yrbcsciqtnmxfquvamm';
const urls = [
  `https://${ref}.supabase.co`,
  `https://${ref}.supabase.in`,
  `https://api.supabase.com/v1/projects/${ref}`,
];

for (const url of urls) {
  console.log(`\nTesting: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    console.log(`✅ HTTP ${res.status} — URL WORKS!`);
  } catch (e) {
    console.log(`❌ ${e.message}`);
  }
}
