-- Quick Fix: Add RLS policies for RSVP inserts
-- Run this in Supabase SQL Editor to fix the "42501" RLS policy violation error

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow public insert on rsvps" ON rsvps;
DROP POLICY IF EXISTS "Allow public insert on rsvp_guests" ON rsvp_guests;

-- Create policy to allow anyone to insert RSVPs
CREATE POLICY "Allow public insert on rsvps"
  ON rsvps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create policy to allow anyone to insert guests
CREATE POLICY "Allow public insert on rsvp_guests"
  ON rsvp_guests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
