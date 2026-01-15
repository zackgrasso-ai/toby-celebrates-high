-- TEMPORARY: Disable RLS for testing
-- WARNING: This removes security! Only use for testing, then re-enable RLS with proper policies
-- Run this in Supabase SQL Editor

-- Disable RLS on both tables
ALTER TABLE public.rsvps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_guests DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('rsvps', 'rsvp_guests')
  AND schemaname = 'public';

-- If rls_enabled is false, RLS is disabled and inserts should work
-- After testing, you should re-enable RLS and create proper policies
