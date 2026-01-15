-- Create database triggers to call the WhatsApp notification edge function
-- when RSVP or guest status changes to 'approved' or 'rejected'
-- Run this SQL in your Supabase SQL Editor

-- IMPORTANT: Before running this, you need to:
-- 1. Enable the pg_net extension: CREATE EXTENSION IF NOT EXISTS pg_net;
-- 2. Set your project URL: ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
-- 3. Set your anon key (for authentication): ALTER DATABASE postgres SET app.settings.anon_key = 'YOUR_ANON_KEY';

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function that calls the edge function via HTTP
CREATE OR REPLACE FUNCTION public.notify_whatsapp_status_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  function_url TEXT;
  supabase_url TEXT;
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

  -- Get Supabase URL and anon key from database settings
  -- These should be set via: ALTER DATABASE postgres SET app.settings.supabase_url = '...';
  supabase_url := current_setting('app.settings.supabase_url', true);
  anon_key := current_setting('app.settings.anon_key', true);

  -- Fallback: construct URL from project reference if available
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://' || current_setting('app.settings.project_ref', true) || '.supabase.co';
  END IF;

  -- Build the function URL
  function_url := supabase_url || '/functions/v1/send-whatsapp-notification';

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
        'Accept', 'application/json'
      ) || CASE 
        WHEN anon_key IS NOT NULL AND anon_key != '' THEN
          jsonb_build_object('Authorization', 'Bearer ' || anon_key)
        ELSE
          '{}'::jsonb
      END,
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

-- Note: The above approach uses pg_net extension which may not be available
-- Alternative approach: Use Supabase's built-in http extension
-- If pg_net is not available, you can use the following alternative:

/*
-- Alternative using http extension (if pg_net is not available)
CREATE OR REPLACE FUNCTION public.notify_whatsapp_status_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  function_url TEXT;
BEGIN
  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get project URL from Supabase settings
  function_url := 'https://' || current_setting('app.settings.project_ref', true) || '.supabase.co/functions/v1/send-whatsapp-notification';

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

  -- Use http extension to make the request
  PERFORM http_post(
    function_url,
    payload::text,
    'application/json'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send WhatsApp notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
