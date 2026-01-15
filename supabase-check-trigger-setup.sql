-- Diagnostic script to check if WhatsApp notification triggers are set up correctly
-- Run this in your Supabase SQL Editor to diagnose issues

-- 1. Check if pg_net extension is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') 
    THEN '✅ pg_net extension is enabled'
    ELSE '❌ pg_net extension is NOT enabled - Run: CREATE EXTENSION IF NOT EXISTS pg_net;'
  END as pg_net_status;

-- 2. Check if the trigger function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_whatsapp_status_change')
    THEN '✅ Trigger function exists'
    ELSE '❌ Trigger function does NOT exist - Run supabase-trigger-whatsapp-notification.sql'
  END as function_status;

-- 3. Check if triggers exist
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE WHEN tgenabled = 'O' THEN '✅ Enabled' ELSE '❌ Disabled' END as status
FROM pg_trigger 
WHERE tgname LIKE '%whatsapp%'
ORDER BY tgname;

-- 4. Check database settings
SELECT 
  name,
  setting,
  CASE 
    WHEN setting IS NULL OR setting = '' THEN '❌ Not set'
    ELSE '✅ Set'
  END as status
FROM pg_settings 
WHERE name IN ('app.settings.supabase_url', 'app.settings.anon_key', 'app.settings.project_ref')
ORDER BY name;

-- 5. Show current trigger function definition (if it exists)
SELECT 
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'notify_whatsapp_status_change'
LIMIT 1;
