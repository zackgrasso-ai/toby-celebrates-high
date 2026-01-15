-- PERMANENTLY DISABLE RLS for RSVP tables
-- WARNING: This removes Row Level Security entirely
-- For a one-time event page, this is acceptable if you trust your API keys
-- Run this in Supabase SQL Editor

-- Disable RLS on both tables
ALTER TABLE public.rsvps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_guests DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (cleanup)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('rsvps', 'rsvp_guests')) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Verify RLS is disabled
SELECT 
  'RLS Status' as status,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN 'ENABLED (needs policies)' ELSE 'DISABLED (no policies needed)' END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('rsvps', 'rsvp_guests');

-- Both tables should show rls_enabled = false
-- This means inserts will work without any RLS policies
