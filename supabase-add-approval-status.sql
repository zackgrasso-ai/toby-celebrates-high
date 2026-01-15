-- Add approval status to rsvps and rsvp_guests tables
-- Run this SQL in your Supabase SQL Editor

-- Add status column to rsvps (pending, approved, rejected)
ALTER TABLE public.rsvps 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add status column to rsvp_guests (pending, approved, rejected)
ALTER TABLE public.rsvp_guests 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add indexes for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_rsvps_status ON public.rsvps(status);
CREATE INDEX IF NOT EXISTS idx_rsvp_guests_status ON public.rsvp_guests(status);

-- Update existing RSVPs to have 'pending' status if they don't have one
UPDATE public.rsvps SET status = 'pending' WHERE status IS NULL;

-- Update existing guests to have 'pending' status if they don't have one
UPDATE public.rsvp_guests SET status = 'pending' WHERE status IS NULL;

-- Add RLS policy for authenticated users to read and update RSVPs
-- This allows admin users to view and manage RSVPs
DROP POLICY IF EXISTS "Allow authenticated users to read rsvps" ON public.rsvps;
CREATE POLICY "Allow authenticated users to read rsvps"
  ON public.rsvps FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update rsvps" ON public.rsvps;
CREATE POLICY "Allow authenticated users to update rsvps"
  ON public.rsvps FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read and update rsvp_guests
DROP POLICY IF EXISTS "Allow authenticated users to read rsvp_guests" ON public.rsvp_guests;
CREATE POLICY "Allow authenticated users to read rsvp_guests"
  ON public.rsvp_guests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to update rsvp_guests" ON public.rsvp_guests;
CREATE POLICY "Allow authenticated users to update rsvp_guests"
  ON public.rsvp_guests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
