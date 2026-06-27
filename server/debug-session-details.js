import { supabase } from './lib/supabase.js';

async function run() {
  try {
    const { data: patient, error: pErr } = await supabase
      .from('patient_sessions')
      .select('*')
      .eq('id', 'b001fe84-fce9-4bd7-b276-e76ac85debab')
      .maybeSingle();

    if (pErr) {
      console.error('Error fetching patient:', pErr.message);
    } else {
      console.log('Patient Session:', patient);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
