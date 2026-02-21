# Party Reminder & Webhook Setup Guide

This guide explains how to set up the party reminder system and WhatsApp webhook for tracking RSVP replies.

## Overview

The system includes:
1. **Send Party Reminder** - Edge function to send reminders to all approved attendees
2. **WhatsApp Webhook** - Edge function to handle incoming replies (YES/NO)
3. **Admin Dashboard Button** - UI to send reminders with timer options

## Step 1: Database Migration

Run the SQL migration to add reply tracking columns:

```bash
# In Supabase SQL Editor, run:
supabase-add-reply-status.sql
```

Or manually execute:
```sql
ALTER TABLE public.rsvps 
ADD COLUMN IF NOT EXISTS reply_status TEXT,
ADD COLUMN IF NOT EXISTS reply_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reply_message TEXT;

ALTER TABLE public.rsvp_guests 
ADD COLUMN IF NOT EXISTS reply_status TEXT,
ADD COLUMN IF NOT EXISTS reply_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reply_message TEXT;
```

## Step 2: Deploy Edge Functions

### Deploy send-party-reminder

```bash
supabase functions deploy send-party-reminder
```

### Deploy whatsapp-webhook

**CRITICAL**: You MUST deploy with `--no-verify-jwt` flag to allow unauthenticated webhook access:

```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

**If you still get 401 errors after deployment:**
1. Go to Supabase Dashboard → Edge Functions → whatsapp-webhook
2. Click on the function settings/configuration
3. Look for "Verify JWT" or "Authentication" setting
4. Disable it and save
5. The webhook secret (`aa668a0e6df1a325fe3e1322092f9498`) provides security instead of JWT

## Step 3: Set Environment Variables

In Supabase Dashboard → Edge Functions → Settings, add:

**For send-party-reminder:**
- `WASENDER_API_KEY` - Your WasenderAPI Bearer token
- `SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

**For whatsapp-webhook:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `WASENDER_API_KEY` - Your WasenderAPI Bearer token (required for sending confirmation messages)
- `WEBHOOK_SECRET` - Your WasenderAPI webhook secret: `aa668a0e6df1a325fe3e1322092f9498`

> **Note:** You can find your service role key in: Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`

## Step 4: Configure WasenderAPI Webhook

1. Go to your WasenderAPI dashboard
2. Navigate to Webhook settings
3. Set the webhook URL to:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/whatsapp-webhook
   ```
4. Configure webhook to send message events (incoming messages)
5. Save the configuration

## Step 5: Test the Setup

### Test Reminder Function

1. Go to Admin Dashboard
2. Click "Send Reminder" button
3. Choose "Test Mode" to send to first 3 people only
4. Check that messages are sent successfully

### Test Webhook

Send a test webhook manually:
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/whatsapp-webhook' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "+1234567890",
    "body": "yes",
    "messageId": "test-123"
  }'
```

Or reply "YES" or "NO" to a reminder message from an approved attendee's phone number.

## Usage

### Sending Reminders

**From Admin Dashboard:**
1. Click "Send Reminder" button in the header
2. Choose one of:
   - **Send Now** - Sends to all approved attendees immediately
   - **Test Mode** - Sends to first 3 people only (for testing)
   - **Schedule Timer** - Choose 30 min, 1 hour, 2 hours, 3 hours, 4 hours, or 6 hours

**Timer Features:**
- Timer runs in the browser
- Shows countdown in the button
- Can be cancelled before it fires
- Automatically sends reminders when timer expires

### Tracking Replies

The webhook automatically:
- Detects YES/NO responses (including emojis like ✅, ❌, 👍, 👎)
- Updates the database with reply status
- Stores the original message and timestamp

**Supported YES responses:**
- "yes", "y", "yeah", "yep", "sure", "ok", "okay"
- "coming", "will be there", "see you"
- ✅, ✓, ✔, 👍 emojis

**Supported NO responses:**
- "no", "n", "nope"
- "can't", "cannot", "won't"
- "not coming", "can't make it", "won't be there"
- ❌, 👎 emojis

## Reminder Message Content

The reminder includes:
- Party time: 21:00
- Date: February 21st, 2026
- Venue: A'DAM 360
- Address: Overhoeksplein 5, 1031 KS Amsterdam, Netherlands
- Google Maps link for directions
- Request to reply YES or NO

## Troubleshooting

### Reminders not sending
- Check `WASENDER_API_KEY` is set correctly
- Verify phone numbers are in correct format
- Check WasenderAPI dashboard for errors/rate limits
- Look at Edge Function logs in Supabase Dashboard

### Webhook not receiving messages (401 Unauthorized)
- **Most common issue**: Function requires unauthenticated access
  - Redeploy with: `supabase functions deploy whatsapp-webhook --no-verify-jwt`
  - OR verify `_config.json` exists with `"verify_jwt": false`
  - OR disable "Verify JWT" in Supabase Dashboard → Edge Functions → whatsapp-webhook → Settings
- Verify webhook URL is correct in WasenderAPI dashboard
- Check webhook is enabled for incoming messages
- Test webhook endpoint with GET request (should return status)
- Check Edge Function logs for errors

### Replies not being detected
- Ensure phone number format matches (with or without +)
- Check that attendee is approved in database
- Verify message contains YES/NO keywords or emojis
- Check database columns exist (run migration if needed)

## Security Notes

- Webhook endpoint returns 200 even on errors to prevent retries
- Service role key is required for database updates (keep it secret!)
- Phone numbers are validated and formatted before processing
- Webhook accepts any format but validates phone numbers

## Next Steps

- View reply status in Admin Dashboard (you may want to add a column to display this)
- Set up automated reminders using Supabase cron jobs (pg_cron)
- Add reply status filtering in the dashboard
- Create reports on attendance based on replies
