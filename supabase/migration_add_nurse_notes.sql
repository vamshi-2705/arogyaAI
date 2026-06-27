-- Run this SQL in your Supabase SQL Editor to support Nurse Notes:
ALTER TABLE patient_sessions ADD COLUMN IF NOT EXISTS nurse_notes TEXT;
