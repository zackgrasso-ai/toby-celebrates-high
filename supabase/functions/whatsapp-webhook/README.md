# WhatsApp Webhook Edge Function

This Supabase Edge Function handles incoming WhatsApp messages from WasenderAPI webhooks and processes RSVP replies.

## Environment Variables

Set these in your Supabase project dashboard under Edge Functions > Settings:

- `SUPABASE_URL`: Your Supabase project URL (required)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (required)
- `WASENDER_API_KEY`: Your WasenderAPI Bearer token (required for sending confirmation messages)
- `WEBHOOK_SECRET`: Your WasenderAPI webhook secret (default: `aa668a0e6df1a325fe3e1322092f9498`)

## Features

- Receives webhook POST requests from WasenderAPI (no authentication required)
- Detects YES/NO responses (including checkmarks and emojis)
- Updates database with reply status
- Sends automatic confirmation messages when YES/NO is detected:
  - **YES**: "Great! We've received your confirmation! See you tonight at 21:00..."
  - **NO**: "Thanks for letting us know. We've removed you from the list..."
- Handles multiple webhook payload formats
- Flexible phone number matching (handles different formats)

## Deployment

**CRITICAL**: You MUST deploy with the `--no-verify-jwt` flag to allow webhook requests:

```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

**Alternative method** (if the above doesn't work):
1. Deploy normally: `supabase functions deploy whatsapp-webhook`
2. Go to Supabase Dashboard → Edge Functions → whatsapp-webhook
3. Click on the function settings
4. Disable "Verify JWT" toggle
5. Save the changes

2. Set environment variables in Supabase Dashboard:
   - Go to Edge Functions → Settings → Secrets
   - Add all required environment variables including `WEBHOOK_SECRET`

4. Configure WasenderAPI webhook:
   - Go to your WasenderAPI dashboard
   - Set webhook URL to: `https://your-project.supabase.co/functions/v1/whatsapp-webhook`
   - Configure webhook to send message events (incoming messages)

## Database Schema

The function expects the following columns in your `rsvps` and `rsvp_guests` tables:
- `reply_status` (TEXT): 'yes', 'no', or NULL
- `reply_received_at` (TIMESTAMP): When the reply was received
- `reply_message` (TEXT): The original message text

If these columns don't exist, you'll need to add them. See the SQL migration file.

## Supported Response Patterns

### YES responses:
- "yes", "y", "yeah", "yep", "sure", "ok", "okay"
- "coming", "will be there", "see you"
- ✅, ✓, ✔, 👍 emojis

### NO responses:
- "no", "n", "nope"
- "can't", "cannot", "won't"
- "not coming", "can't make it", "won't be there"
- ❌, 👎 emojis

## Testing

Test the webhook endpoint:
```bash
curl -X GET \
  'https://your-project.supabase.co/functions/v1/whatsapp-webhook'
```

Send a test webhook:
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/whatsapp-webhook' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "+1234567890",
    "body": "yes",
    "messageId": "test-123"
  }'
```
