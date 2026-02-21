# Send Party Reminder Edge Function

This Supabase Edge Function sends party reminders to all approved attendees via WhatsApp using WasenderAPI.

## Environment Variables

Set these in your Supabase project dashboard under Edge Functions > Settings:

- `WASENDER_API_KEY`: Your WasenderAPI Bearer token (required)
- `SUPABASE_URL`: Your Supabase project URL (required)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (required)

## Features

- Sends reminders to all approved RSVPs and guests
- Includes party time (21:00), date, venue, and Google Maps link
- Sends messages in batches to avoid rate limiting
- Supports test mode (sends to first 3 people only)
- Returns detailed results of sent messages

## Deployment

1. Deploy the function:
   ```bash
   supabase functions deploy send-party-reminder
   ```

2. Set environment variables in Supabase Dashboard

## Usage

### Send reminders immediately:
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/send-party-reminder' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Test mode (send to first 3 people only):
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/send-party-reminder' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"testMode": true}'
```

## Response

Returns a JSON object with:
- `success`: boolean
- `message`: status message
- `total`: total number of recipients
- `sent`: number of successfully sent messages
- `failed`: number of failed messages
- `results`: array of individual send results
