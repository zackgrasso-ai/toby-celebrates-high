// Supabase Edge Function to send WhatsApp notifications via WAHA API
// This function is triggered when an RSVP or guest status changes to 'approved' or 'rejected'

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const WAHA_API_URL = Deno.env.get('WAHA_API_URL') || ''
const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY') || ''
const WAHA_SESSION = Deno.env.get('WAHA_SESSION') || 'default'

interface WhatsAppPayload {
  type: 'rsvp' | 'guest'
  id: string
  name: string
  phone: string
  status: 'approved' | 'rejected'
  old_status?: string
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse the request body
    const payload: WhatsAppPayload = await req.json()

    // Validate required fields
    if (!payload.type || !payload.name || !payload.phone || !payload.status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, name, phone, status' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Only send notifications for approved or rejected status
    if (payload.status !== 'approved' && payload.status !== 'rejected') {
      return new Response(
        JSON.stringify({ message: 'Status is not approved or rejected, skipping notification' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Don't send if status hasn't actually changed
    if (payload.old_status === payload.status) {
      return new Response(
        JSON.stringify({ message: 'Status unchanged, skipping notification' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate WAHA API configuration
    if (!WAHA_API_URL) {
      console.error('WAHA_API_URL environment variable is not set')
      return new Response(
        JSON.stringify({ error: 'WAHA API URL not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number for WhatsApp (remove + and any non-digit characters, add @c.us)
    const formattedPhone = payload.phone.replace(/\D/g, '') + '@c.us'

    // Create message based on status
    const message = payload.status === 'approved'
      ? `🎉 Hello ${payload.name}! Your RSVP has been approved. We're excited to celebrate with you!`
      : `Hello ${payload.name}, we're sorry to inform you that your RSVP could not be approved at this time. If you have any questions, please contact us.`

    // Prepare WAHA API request
    const wahaRequest = {
      session: WAHA_SESSION,
      chatId: formattedPhone,
      text: message
    }

    // Send WhatsApp message via WAHA API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    if (WAHA_API_KEY) {
      headers['X-Api-Key'] = WAHA_API_KEY
    }

    const wahaResponse = await fetch(`${WAHA_API_URL}/api/sendText`, {
      method: 'POST',
      headers,
      body: JSON.stringify(wahaRequest)
    })

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text()
      console.error('WAHA API error:', errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send WhatsApp message',
          details: errorText 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const wahaResult = await wahaResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'WhatsApp notification sent successfully',
        wahaResponse: wahaResult
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-whatsapp-notification function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
