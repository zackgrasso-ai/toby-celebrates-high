#!/bin/bash
# Test script for WhatsApp group creation edge function
# Replace YOUR_ANON_KEY with your actual anon key from Supabase Dashboard
# Replace YOUR_PROJECT_REF with your Supabase project reference

PROJECT_REF="ikedowhnswkrrzkgjcrx"  # Update this with your project ref
ANON_KEY="YOUR_ANON_KEY"  # Update this with your anon key

curl -X POST \
  "https://${PROJECT_REF}.supabase.co/functions/v1/create-whatsapp-group" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "participants": [
      {"name": "Test User 1", "phone": "+1234567890"},
      {"name": "Test User 2", "phone": "+0987654321"}
    ],
    "groupName": "Toby'\''s Birthday Party Group"
  }'
