# Fixing 401 Unauthorized Error for WhatsApp Webhook

If you're getting a 401 error when WasenderAPI tries to send webhooks, follow these steps:

## Step 1: Redeploy with --no-verify-jwt Flag

The most important step is to deploy the function without JWT verification:

```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

## Step 2: Verify Function Settings in Dashboard

1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions** → **whatsapp-webhook**
3. Click on the function settings/configuration
4. Look for **"Verify JWT"** or **"Authentication"** toggle
5. **Disable it** if it's enabled
6. Save the changes

## Step 3: Set Environment Variables

Make sure these are set in **Edge Functions → Settings → Secrets**:

- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `WASENDER_API_KEY` - WasenderAPI token
- `WEBHOOK_SECRET` - Set to: `aa668a0e6df1a325fe3e1322092f9498`

## Step 4: Configure WasenderAPI Webhook

In your WasenderAPI dashboard:
- Webhook URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/whatsapp-webhook`
- Webhook Secret: `aa668a0e6df1a325fe3e1322092f9498`
- Make sure webhook is enabled for incoming messages

## Step 5: Test the Webhook

Test with a GET request (should return 200):
```bash
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/whatsapp-webhook
```

## Why This Happens

Supabase Edge Functions require authentication by default. Since WasenderAPI doesn't send Supabase JWT tokens, we need to:
1. Disable JWT verification (`--no-verify-jwt`)
2. Use webhook secret verification instead for security

The webhook secret (`aa668a0e6df1a325fe3e1322092f9498`) is now hardcoded in the function and will be verified if WasenderAPI sends it in headers or payload.

## Troubleshooting

If you still get 401:
1. Check Edge Function logs in Supabase Dashboard
2. Verify the function was deployed with `--no-verify-jwt`
3. Try disabling JWT verification in the dashboard manually
4. Check that the webhook URL in WasenderAPI is correct
5. Verify all environment variables are set correctly
