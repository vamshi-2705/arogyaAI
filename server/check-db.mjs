import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDB() {
  console.log('Checking Supabase connection...');

  // Check if hospitals table exists
  const { data: hospitals, error: hErr } = await supabase
    .from('hospitals')
    .select('id, name')
    .limit(5);

  if (hErr) {
    console.error('❌ hospitals table error:', hErr.message);
    console.log('\n👉 Schema has NOT been run. Run supabase/schema.sql in Supabase SQL Editor!');
    return;
  }

  console.log('✅ hospitals table OK. Rows:', hospitals);

  // Check nurses
  const { data: nurses, error: nErr } = await supabase
    .from('nurses')
    .select('id, email, name')
    .limit(5);

  if (nErr) {
    console.error('❌ nurses table error:', nErr.message);
    return;
  }
  console.log('✅ nurses table OK. Rows:', nurses);

  // Try login
  const bcrypt = (await import('bcrypt'));
  const nurse = nurses?.find(n => n.email === 'nurse@demo.com');
  if (!nurse) {
    console.log('\n❌ Demo nurse NOT found. Schema seed data may have failed.');
  } else {
    console.log('\n✅ Demo nurse found:', nurse.email);
  }
}

checkDB().catch(e => console.error('Fatal:', e.message));
