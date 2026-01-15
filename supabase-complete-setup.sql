-- Complete Supabase Setup for RSVP Tables
-- Run this ENTIRE script in Supabase SQL Editor
-- This will create tables, indexes, triggers, and RLS policies

-- Step 1: Create rsvps table (main attendee)
CREATE TABLE IF NOT EXISTS public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create rsvp_guests table (additional guests)
CREATE TABLE IF NOT EXISTS public.rsvp_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_id UUID NOT NULL REFERENCES public.rsvps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create index on rsvp_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rsvp_guests_rsvp_id ON public.rsvp_guests(rsvp_id);

-- Step 4: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_rsvps_updated_at ON public.rsvps;
CREATE TRIGGER update_rsvps_updated_at
  BEFORE UPDATE ON public.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 6: Enable Row Level Security (RLS)
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_guests ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow public insert on rsvps" ON public.rsvps;
DROP POLICY IF EXISTS "Allow public insert on rsvp_guests" ON public.rsvp_guests;

-- Step 8: Create INSERT policies for anon role
CREATE POLICY "Allow public insert on rsvps"
  ON public.rsvps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert on rsvp_guests"
  ON public.rsvp_guests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Step 9: Verify policies were created (this will show in results)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('rsvps', 'rsvp_guests')
ORDER BY tablename, policyname;
