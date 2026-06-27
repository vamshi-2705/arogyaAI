import { supabase } from './lib/supabase.js';
import { generateGreeting } from './agents/greeter.js';

async function run() {
  try {
    console.log('Inserting test session...');
    const { data: session, error } = await supabase
      .from('patient_sessions')
      .insert({
        hospital_id: '00000000-0000-0000-0000-000000000001',
        language: 'te',
        status: 'waiting',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase Session Insertion Error:', error.message);
      return;
    }
    console.log('SUCCESS: Session created:', session.id);

    console.log('Saving greeting...');
    const greeting = await generateGreeting(session.id, 'te');
    console.log('SUCCESS: Greeting saved:', greeting);
  } catch (e) {
    console.error('Code threw error:', e.message, e.stack);
  }
}

run();
