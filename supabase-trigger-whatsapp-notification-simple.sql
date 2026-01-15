-- SIMPLIFIED VERSION: Create database triggers to call the WhatsApp notification edge function
-- This version uses a hardcoded project URL - update it with your project reference
-- Run this SQL in your Supabase SQL Editor

-- IMPORTANT: Update these values with your actual Supabase project details:
-- 1. Replace 'ikedowhnswkrrzkgjcrx' with your project reference (from your Supabase dashboard URL)
-- 2. Replace 'YOUR_ANON_KEY' with your actual anon key (from Supabase Dashboard → Settings → API)

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function that calls the edge function via HTTP
CREATE OR REPLACE FUNCTION public.notify_whatsapp_status_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  function_url TEXT;
  anon_key TEXT;
BEGIN
  -- Only proceed if status has changed to approved or rejected
  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Don't send if status hasn't actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Hardcode your project URL and anon key (update these!)
  function_url := 'https://ikedowhnswkrrzkgjcrx.supabase.co/functions/v1/send-whatsapp-notification';
  anon_key := 'YOUR_ANON_KEY'; -- TODO: Replace with your actual anon key

  -- Build payload based on table
  IF TG_TABLE_NAME = 'rsvps' THEN
    payload := jsonb_build_object(
      'type', 'rsvp',
      'id', NEW.id,
      'name', NEW.full_name,
      'phone', NEW.phone,
      'status', NEW.status,
      'old_status', OLD.status
    );
  ELSIF TG_TABLE_NAME = 'rsvp_guests' THEN
    payload := jsonb_build_object(
      'type', 'guest',
      'id', NEW.id,
      'name', NEW.name,
      'phone', NEW.phone,
      'status', NEW.status,
      'old_status', OLD.status
    );
  ELSE
    RETURN NEW;
  END IF;

  -- Call the edge function using pg_net extension
  -- This makes an asynchronous HTTP request (fire and forget)
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Accept', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := payload::text
    );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    -- This ensures that status updates still succeed even if notification fails
    RAISE WARNING 'Failed to send WhatsApp notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for rsvps table
DROP TRIGGER IF EXISTS trigger_whatsapp_notification_rsvps ON public.rsvps;
CREATE TRIGGER trigger_whatsapp_notification_rsvps
  AFTER UPDATE OF status ON public.rsvps
  FOR EACH ROW
  WHEN (NEW.status IN ('approved', 'rejected') AND (OLD.status IS DISTINCT FROM NEW.status))
  EXECUTE FUNCTION public.notify_whatsapp_status_change();

-- Create trigger for rsvp_guests table
DROP TRIGGER IF EXISTS trigger_whatsapp_notification_guests ON public.rsvp_guests;
CREATE TRIGGER trigger_whatsapp_notification_guests
  AFTER UPDATE OF status ON public.rsvp_guests
  FOR EACH ROW
  WHEN (NEW.status IN ('approved', 'rejected') AND (OLD.status IS DISTINCT FROM NEW.status))
  EXECUTE FUNCTION public.notify_whatsapp_status_change();

-- Verify triggers were created
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  '✅ Created' as status
FROM pg_trigger 
WHERE tgname LIKE '%whatsapp%';
