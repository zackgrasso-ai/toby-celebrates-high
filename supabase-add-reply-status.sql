-- Add reply status columns to track WhatsApp responses
-- Run this SQL in your Supabase SQL Editor

-- Add reply tracking columns to rsvps table
ALTER TABLE public.rsvps 
ADD COLUMN IF NOT EXISTS reply_status TEXT,
ADD COLUMN IF NOT EXISTS reply_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reply_message TEXT;

-- Add reply tracking columns to rsvp_guests table
ALTER TABLE public.rsvp_guests 
ADD COLUMN IF NOT EXISTS reply_status TEXT,
ADD COLUMN IF NOT EXISTS reply_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reply_message TEXT;

-- Create index for faster lookups by reply status
CREATE INDEX IF NOT EXISTS idx_rsvps_reply_status ON public.rsvps(reply_status);
CREATE INDEX IF NOT EXISTS idx_rsvp_guests_reply_status ON public.rsvp_guests(reply_status);

-- Add comment to explain the columns
COMMENT ON COLUMN public.rsvps.reply_status IS 'Response to party reminder: yes, no, or NULL';
COMMENT ON COLUMN public.rsvps.reply_received_at IS 'Timestamp when the reply was received';
COMMENT ON COLUMN public.rsvps.reply_message IS 'Original message text from the attendee';

COMMENT ON COLUMN public.rsvp_guests.reply_status IS 'Response to party reminder: yes, no, or NULL';
COMMENT ON COLUMN public.rsvp_guests.reply_received_at IS 'Timestamp when the reply was received';
COMMENT ON COLUMN public.rsvp_guests.reply_message IS 'Original message text from the attendee';
