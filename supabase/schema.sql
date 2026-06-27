-- ============================================================
-- AROGYA WATCH AI — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Hospitals table (future multi-hospital support)
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  qr_code_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Nurses table
CREATE TABLE nurses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Patient sessions (anonymous, created on QR scan)
CREATE TABLE patient_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id),
  patient_name TEXT,
  language TEXT DEFAULT 'te',         -- 'te' | 'hi'
  severity TEXT DEFAULT 'pending',    -- 'pending' | 'low' | 'medium' | 'high' | 'critical'
  severity_score INT DEFAULT 0,       -- 0-100
  queue_position INT,
  status TEXT DEFAULT 'waiting',      -- 'waiting' | 'seen' | 'discharged'
  triage_complete BOOLEAN DEFAULT false,
  last_check_in TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages for each patient session
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES patient_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                 -- 'user' | 'assistant'
  content TEXT NOT NULL,
  agent TEXT,                         -- 'greeter' | 'watcher' | 'comforter' | 'commander'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Triage data collected by GREETER agent
CREATE TABLE triage_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES patient_sessions(id) ON DELETE CASCADE,
  main_complaint TEXT,
  pain_level INT,                     -- 1-10
  duration_hours FLOAT,
  previous_conditions TEXT,
  current_medications TEXT,
  raw_responses JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Condition checks logged by WATCHER agent
CREATE TABLE condition_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES patient_sessions(id) ON DELETE CASCADE,
  reported_status TEXT,               -- 'same' | 'better' | 'worse'
  previous_severity TEXT,
  new_severity TEXT,
  escalated BOOLEAN DEFAULT false,
  nurse_alerted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Nurse alerts
CREATE TABLE nurse_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES patient_sessions(id),
  hospital_id UUID REFERENCES hospitals(id),
  alert_type TEXT NOT NULL,           -- 'critical' | 'no_response' | 'escalation'
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Supabase Realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE patient_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE nurse_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE condition_checks;

-- ============================================================
-- SEED DATA — Demo hospital + nurse for testing
-- ============================================================

-- Demo hospital
INSERT INTO hospitals (id, name, city)
VALUES ('00000000-0000-0000-0000-000000000001', 'Osmania General Hospital', 'Hyderabad');

-- Demo nurse (password: password123)
-- bcrypt hash of "password123" with 10 rounds
INSERT INTO nurses (hospital_id, name, email, password_hash)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Nurse Priya',
  'nurse@demo.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
);
