-- CORRECT RLS SETUP: Explicit policies for anon role
-- Run this in Supabase SQL Editor after disabling RLS
-- This creates the most permissive and explicit policies

-- Step 1: Ensure RLS is enabled
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_guests ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on these tables (clean slate)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('rsvps', 'rsvp_guests')) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, 
            (SELECT tablename FROM pg_policies WHERE policyname = r.policyname AND tablename IN ('rsvps', 'rsvp_guests') LIMIT 1));
    END LOOP;
END $$;

-- Step 3: Create permissive INSERT policy for rsvps (allows anon role)
CREATE POLICY "anon_insert_rsvps"
  ON public.rsvps
  AS PERMISSIVE
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Step 4: Create permissive INSERT policy for authenticated users on rsvps
CREATE POLICY "authenticated_insert_rsvps"
  ON public.rsvps
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 5: Create permissive INSERT policy for rsvp_guests (allows anon role)
CREATE POLICY "anon_insert_rsvp_guests"
  ON public.rsvp_guests
  AS PERMISSIVE
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Step 6: Create permissive INSERT policy for authenticated users on rsvp_guests
CREATE POLICY "authenticated_insert_rsvp_guests"
  ON public.rsvp_guests
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 7: Verify policies were created correctly
SELECT 
  'RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('rsvps', 'rsvp_guests')
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;

-- You should see 4 rows total:
-- - anon_insert_rsvps (anon role, INSERT)
-- - authenticated_insert_rsvps (authenticated role, INSERT)
-- - anon_insert_rsvp_guests (anon role, INSERT)
-- - authenticated_insert_rsvp_guests (authenticated role, INSERT)

-- Step 8: Verify RLS is enabled
SELECT 
  'RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('rsvps', 'rsvp_guests');

-- Both tables should show rls_enabled = true
