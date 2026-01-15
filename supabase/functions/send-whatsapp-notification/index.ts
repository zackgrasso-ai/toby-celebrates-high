// Supabase Edge Function to send WhatsApp notifications via WasenderAPI
// This function is triggered when an RSVP or guest status changes to 'approved' or 'rejected'

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const WASENDER_API_URL = 'https://wasenderapi.com/api/send-message'
const WASENDER_API_KEY = Deno.env.get('WASENDER_API_KEY') || ''

interface WhatsAppPayload {
  type: 'rsvp' | 'guest'
  id: string
  name: string
  phone: string
  status: 'approved' | 'rejected'
  old_status?: string
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Parse the request body
    const payload: WhatsAppPayload = await req.json()

    // Validate required fields
    if (!payload.type || !payload.name || !payload.phone || !payload.status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, name, phone, status' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Only send notifications for approved or rejected status
    if (payload.status !== 'approved' && payload.status !== 'rejected') {
      return new Response(
        JSON.stringify({ message: 'Status is not approved or rejected, skipping notification' }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Don't send if status hasn't actually changed
    if (payload.old_status === payload.status) {
      return new Response(
        JSON.stringify({ message: 'Status unchanged, skipping notification' }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Validate WasenderAPI configuration
    if (!WASENDER_API_KEY) {
      console.error('WASENDER_API_KEY environment variable is not set')
      return new Response(
        JSON.stringify({ error: 'WasenderAPI key not configured' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Format phone number for WasenderAPI (ensure it starts with +)
    let formattedPhone = payload.phone.trim()
    if (!formattedPhone.startsWith('+')) {
      // Add + and keep only digits
      formattedPhone = '+' + formattedPhone.replace(/\D/g, '')
    } else {
      // Already has +, keep + and digits only
      formattedPhone = '+' + formattedPhone.substring(1).replace(/\D/g, '')
    }

    // Create message based on status
    const message = payload.status === 'approved'
      ? `🎉 Hello ${payload.name}! Your RSVP has been approved. We're excited to celebrate with you!`
      : `Hello ${payload.name}, we're sorry to inform you that your RSVP could not be approved at this time. If you have any questions, please contact us.`

    // Prepare WasenderAPI request
    const wasenderRequest = {
      to: formattedPhone,
      text: message
    }

    // Send WhatsApp message via WasenderAPI
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WASENDER_API_KEY}`
    }

    const wasenderResponse = await fetch(WASENDER_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(wasenderRequest)
    })

    if (!wasenderResponse.ok) {
      const errorText = await wasenderResponse.text()
      console.error('WasenderAPI error:', errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send WhatsApp message',
          details: errorText 
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    const wasenderResult = await wasenderResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'WhatsApp notification sent successfully',
        wasenderResponse: wasenderResult
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )

  } catch (error) {
    console.error('Error in send-whatsapp-notification function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )
  }
})
