-- Test script to manually trigger the WhatsApp notification function
-- This helps verify the trigger is working correctly
-- Run this in your Supabase SQL Editor

-- First, let's see if we can find an RSVP to test with
SELECT 
  id,
  full_name,
  phone,
  status,
  created_at
FROM public.rsvps
ORDER BY created_at DESC
LIMIT 5;

-- To test the trigger manually, you can:
-- 1. Find an RSVP ID from above
-- 2. Update its status (this will trigger the function)
-- Example (replace 'YOUR_RSVP_ID' with an actual ID):
/*
UPDATE public.rsvps 
SET status = 'approved' 
WHERE id = 'YOUR_RSVP_ID' 
  AND status != 'approved';
*/

-- Or test by changing status back and forth:
/*
-- Set to pending first
UPDATE public.rsvps 
SET status = 'pending' 
WHERE id = 'YOUR_RSVP_ID';

-- Then approve (this should trigger the notification)
UPDATE public.rsvps 
SET status = 'approved' 
WHERE id = 'YOUR_RSVP_ID';
*/

-- Check if the function was called by looking at pg_net logs
-- (Note: This might not be available in all Supabase plans)
SELECT 
  id,
  url,
  method,
  status_code,
  created_at
FROM net.http_request_queue
ORDER BY created_at DESC
LIMIT 10;
