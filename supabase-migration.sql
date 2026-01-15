-- Supabase Migration: RSVP Tables
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Create rsvps table (main attendee)
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rsvp_guests table (additional guests)
CREATE TABLE IF NOT EXISTS rsvp_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_id UUID NOT NULL REFERENCES rsvps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on rsvp_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rsvp_guests_rsvp_id ON rsvp_guests(rsvp_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_rsvps_updated_at
  BEFORE UPDATE ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_guests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow public insert on rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow public insert on rsvp_guests" ON rsvp_guests;

-- Create policy to allow anyone to insert RSVPs (adjust as needed for your security requirements)
CREATE POLICY "Allow public insert on rsvps"
  ON rsvps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create policy to allow anyone to insert guests (adjust as needed for your security requirements)
CREATE POLICY "Allow public insert on rsvp_guests"
  ON rsvp_guests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Optional: Create policy to allow reading RSVPs (you may want to restrict this to authenticated users only)
-- Uncomment the following if you want to allow reading RSVPs:
-- CREATE POLICY "Allow public read on rsvps"
--   ON rsvps FOR SELECT
--   TO anon, authenticated
--   USING (true);

-- CREATE POLICY "Allow public read on rsvp_guests"
--   ON rsvp_guests FOR SELECT
--   TO anon, authenticated
--   USING (true);
