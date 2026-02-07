# Create WhatsApp Group Edge Function

This Supabase Edge Function creates a WhatsApp group chat with selected participants.

## Environment Variables

Set these in your Supabase project dashboard under Edge Functions > Settings:

- `WASENDER_API_KEY`: Your WasenderAPI Bearer token (required)

## Important Note

**WasenderAPI may not support direct group creation.** This function is structured to:
1. First attempt to use WasenderAPI's group creation endpoint (if available)
2. Fall back to returning formatted participant data if group creation isn't supported

If WasenderAPI doesn't support groups, you have these options:

### Option 1: Use Whapi.Cloud
Replace the WasenderAPI call with Whapi.Cloud's group creation endpoint:
```typescript
const whapiResponse = await fetch('https://gate.whapi.cloud/groups', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${WHAPI_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    subject: groupName,
    participants: phoneNumbers,
  }),
});
```

### Option 2: Use WhatsApp Business API
If you have access to WhatsApp Business API, you can use their group creation endpoints.

### Option 3: Manual Group Creation
The function returns formatted participant data that you can use to manually create a group.

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
   supabase functions deploy create-whatsapp-group
   ```

## Testing

You can test the function manually using curl:

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/create-whatsapp-group' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "participants": [
      {"name": "John Doe", "phone": "+1234567890"},
      {"name": "Jane Smith", "phone": "+0987654321"}
    ],
    "groupName": "Test Group"
  }'
```

## Request Format

```json
{
  "participants": [
    {
      "name": "Person Name",
      "phone": "+1234567890"
    }
  ],
  "groupName": "Optional Group Name"
}
```

## Response Format

On success:
```json
{
  "success": true,
  "message": "WhatsApp group created successfully",
  "groupName": "Group Name",
  "participants": [...],
  "wasenderResponse": {...}
}
```

If WasenderAPI doesn't support groups:
```json
{
  "success": true,
  "message": "Group creation data prepared. WasenderAPI may not support direct group creation.",
  "groupName": "Group Name",
  "participants": [...],
  "phoneNumbers": [...],
  "note": "You may need to use Whapi.Cloud, WhatsApp Business API, or create the group manually"
}
```
