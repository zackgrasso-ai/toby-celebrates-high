-- COMPLETE FRESH SETUP: Rebuild RSVP tables and RLS from scratch
-- Run this ENTIRE script in Supabase SQL Editor
-- This will drop existing tables and recreate everything properly

-- Step 1: Drop existing tables (CASCADE will also drop dependent objects)
DROP TABLE IF EXISTS public.rsvp_guests CASCADE;
DROP TABLE IF EXISTS public.rsvps CASCADE;

-- Step 2: Drop existing function and trigger if they exist
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Step 3: Create rsvps table (main attendee)
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create rsvp_guests table (additional guests)
CREATE TABLE public.rsvp_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_id UUID NOT NULL REFERENCES public.rsvps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create index on rsvp_id for faster lookups
CREATE INDEX idx_rsvp_guests_rsvp_id ON public.rsvp_guests(rsvp_id);

-- Step 6: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to automatically update updated_at
CREATE TRIGGER update_rsvps_updated_at
  BEFORE UPDATE ON public.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 8: Enable Row Level Security (RLS)
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_guests ENABLE ROW LEVEL SECURITY;

-- Step 9: Create INSERT policies for anon role (this is the critical part!)
CREATE POLICY "Allow public insert on rsvps"
  ON public.rsvps 
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert on rsvp_guests"
  ON public.rsvp_guests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Step 10: Verify everything was created correctly
SELECT 
  'Tables created' as check_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('rsvps', 'rsvp_guests')

UNION ALL

SELECT 
  'RLS policies created' as check_type,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('rsvps', 'rsvp_guests')
  AND cmd = 'INSERT';

-- You should see:
-- 1 row with "Tables created" and count = 2
-- 1 row with "RLS policies created" and count = 2
-- If both show count = 2, everything is set up correctly!
