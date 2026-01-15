-- FINAL FIX: Create RLS INSERT policies for RSVP tables
-- Run this in Supabase SQL Editor
-- Make sure you're in the correct database and schema

-- Step 1: Ensure we're working with the public schema
SET search_path = public;

-- Step 2: Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow public insert on rsvps" ON public.rsvps;
DROP POLICY IF EXISTS "Allow public insert on rsvp_guests" ON public.rsvp_guests;

-- Step 3: Create INSERT policy for rsvps table
-- This allows both anonymous (anon) and authenticated users to insert
CREATE POLICY "Allow public insert on rsvps"
  ON public.rsvps 
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Step 4: Create INSERT policy for rsvp_guests table
CREATE POLICY "Allow public insert on rsvp_guests"
  ON public.rsvp_guests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Step 5: Verify the policies were created
-- You should see 2 rows in the results
SELECT 
  'Policy created successfully!' as status,
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN ('rsvps', 'rsvp_guests')
  AND cmd = 'INSERT'
ORDER BY tablename;

-- If you see 2 rows above, the policies are created correctly!
-- If you see 0 rows, there was an error - check the error message above
