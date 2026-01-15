# Send WhatsApp Notification Edge Function

This Supabase Edge Function sends WhatsApp messages via WasenderAPI when RSVP or guest statuses change to 'approved' or 'rejected'.

## Environment Variables

Set these in your Supabase project dashboard under Edge Functions > Settings:

- `WASENDER_API_KEY`: Your WasenderAPI Bearer token (required)

## Deployment

1. Install Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy send-whatsapp-notification
   ```

## Database Trigger

This function is called by database triggers when RSVP or guest status changes. See `supabase-trigger-whatsapp-notification.sql` for the trigger setup.

## Testing

You can test the function manually by calling it with a POST request:

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/send-whatsapp-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "rsvp",
    "id": "123",
    "name": "John Doe",
    "phone": "+1234567890",
    "status": "approved"
  }'
```
