#!/bin/bash
# Test script for WhatsApp notification edge function
# Replace YOUR_ANON_KEY with your actual anon key from Supabase Dashboard

curl -X POST \
  'https://ikedowhnswkrrzkgjcrx.supabase.co/functions/v1/send-whatsapp-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "rsvp",
    "id": "test-123",
    "name": "Test User",
    "phone": "+1234567890",
    "status": "approved",
    "old_status": "pending"
  }'
