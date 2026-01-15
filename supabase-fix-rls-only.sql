-- Fix RLS Policies for RSVP Inserts
-- Run this in Supabase SQL Editor
-- This ONLY creates the INSERT policies (assumes tables already exist)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert on rsvps" ON public.rsvps;
DROP POLICY IF EXISTS "Allow public insert on rsvp_guests" ON public.rsvp_guests;

-- Create INSERT policy for rsvps table
CREATE POLICY "Allow public insert on rsvps"
  ON public.rsvps 
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create INSERT policy for rsvp_guests table  
CREATE POLICY "Allow public insert on rsvp_guests"
  ON public.rsvp_guests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Verify the policies were created (should show 2 rows)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('rsvps', 'rsvp_guests')
  AND cmd = 'INSERT'
ORDER BY tablename;
