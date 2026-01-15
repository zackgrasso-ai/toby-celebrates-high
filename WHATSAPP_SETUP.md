# WhatsApp Notification Setup Guide

This guide explains how to set up WhatsApp notifications via WAHA API when RSVP statuses change to 'approved' or 'rejected'.

## Prerequisites

1. A WAHA API instance running and accessible
2. Supabase CLI installed (`npm install -g supabase`)
3. Your Supabase project reference and API keys

## Step 1: Deploy the Edge Function

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   Replace `your-project-ref` with your actual Supabase project reference (found in your Supabase dashboard URL).

4. **Set environment variables** in your Supabase project:
   - Go to your Supabase Dashboard → Edge Functions → Settings
   - Add the following secrets:
     - `WAHA_API_URL`: Your WAHA API base URL (e.g., `https://waha.example.com`)
     - `WAHA_API_KEY`: (Optional) Your WAHA API key if authentication is required
     - `WAHA_SESSION`: (Optional) WhatsApp session name, defaults to `'default'`

5. **Deploy the function**:
   ```bash
   supabase functions deploy send-whatsapp-notification
   ```

## Step 2: Set Up Database Triggers

1. **Enable pg_net extension** in your Supabase SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

2. **Configure database settings** (replace with your actual values):
   ```sql
   -- Set your Supabase project URL
   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
   
   -- Set your anon key for authentication
   ALTER DATABASE postgres SET app.settings.anon_key = 'YOUR_ANON_KEY';
   ```
   
   You can find your anon key in: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

3. **Run the trigger SQL**:
   ```sql
   -- Copy and paste the contents of supabase-trigger-whatsapp-notification.sql
   -- into your Supabase SQL Editor and execute it
   ```

## Step 3: Test the Setup

### Test the Edge Function Directly

You can test the edge function manually using curl:

```bash
curl -X POST \
  'https://ikedowhnswkrrzkgjcrx.supabase.co/functions/v1/send-whatsapp-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "rsvp",
    "id": "test-123",
    "name": "Test User",
    "phone": "+1234567890",
    "status": "approved"
  }'
```

### Test via Database Trigger

1. Go to your Supabase Dashboard → Table Editor
2. Find an RSVP with status 'pending'
3. Update its status to 'approved' or 'rejected'
4. Check your WAHA API logs to verify the message was sent

## Phone Number Format

The edge function automatically formats phone numbers for WhatsApp:
- Removes all non-digit characters (including `+`)
- Appends `@c.us` suffix (for individual chats)
- Example: `+1234567890` → `1234567890@c.us`

## Message Templates

### Approved Message
```
🎉 Hello {name}! Your RSVP has been approved. We're excited to celebrate with you!
```

### Rejected Message
```
Hello {name}, we're sorry to inform you that your RSVP could not be approved at this time. If you have any questions, please contact us.
```

You can customize these messages in `/supabase/functions/send-whatsapp-notification/index.ts`.

## Troubleshooting

### Function not being called
- Check that the triggers are created: `SELECT * FROM pg_trigger WHERE tgname LIKE '%whatsapp%';`
- Verify pg_net extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
- Check database settings: `SHOW app.settings.supabase_url;`

### WAHA API errors
- Verify `WAHA_API_URL` is set correctly in Edge Function secrets
- Check that your WAHA instance is accessible and the session is active
- Verify phone number format is correct (should be digits only + `@c.us`)

### Authentication errors
- Ensure `app.settings.anon_key` is set in the database
- Verify the anon key is correct and has permission to call edge functions

## Security Notes

- The edge function uses the anon key for authentication, which is safe for this use case
- Phone numbers are validated and formatted before sending
- The trigger function uses `SECURITY DEFINER` to allow HTTP calls
- Errors are logged but don't fail the database transaction

## Customization

To customize the WhatsApp messages, edit:
- `/supabase/functions/send-whatsapp-notification/index.ts` - Message templates and logic

To modify when notifications are sent, edit:
- `/supabase-trigger-whatsapp-notification.sql` - Trigger conditions
