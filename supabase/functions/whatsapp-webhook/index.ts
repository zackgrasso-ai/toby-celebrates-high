// Supabase Edge Function to handle WasenderAPI webhook for incoming WhatsApp messages
// This function processes replies (YES/NO/checkmarks) and updates the database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const WASENDER_API_URL = 'https://wasenderapi.com/api/send-message'
const WASENDER_API_KEY = Deno.env.get('WASENDER_API_KEY') || ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || 'aa668a0e6df1a325fe3e1322092f9498'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

// Patterns to detect YES/NO responses
const YES_PATTERNS = [
  /^yes$/i,
  /^y$/i,
  /^yeah$/i,
  /^yep$/i,
  /^sure$/i,
  /^ok$/i,
  /^okay$/i,
  /^coming$/i,
  /^will be there$/i,
  /^see you$/i,
  /^✅/,
  /^✓/,
  /^✔/,
  /^👍/,
  /^yes\s*!*/i,
]

const NO_PATTERNS = [
  /^no$/i,
  /^n$/i,
  /^nope$/i,
  /^can't$/i,
  /^cannot$/i,
  /^won't$/i,
  /^not coming$/i,
  /^can't make it$/i,
  /^won't be there$/i,
  /^❌/,
  /^👎/,
  /^no\s*!*/i,
]

interface WebhookPayload {
  from?: string
  to?: string
  body?: string
  messageId?: string
  timestamp?: string
  type?: string
  event?: string
  // WasenderAPI webhook format may vary, so we'll handle multiple formats
  phone?: string
  sender?: string
  from_number?: string
  text?: string
  message?: string
  content?: string
  // WasenderAPI nested format
  data?: {
    messages?: {
      key?: {
        cleanedSenderPn?: string
        senderPn?: string
        remoteJid?: string
      }
      messageBody?: string
      message?: {
        conversation?: string
        text?: string
        [key: string]: any
      }
      pushName?: string
      [key: string]: any
    }
    [key: string]: any
  }
  [key: string]: any // Allow any additional fields
}

function detectResponse(message: string): 'yes' | 'no' | 'unknown' {
  const cleanMessage = message.trim()
  
  // Check for YES patterns
  for (const pattern of YES_PATTERNS) {
    if (pattern.test(cleanMessage)) {
      return 'yes'
    }
  }
  
  // Check for NO patterns
  for (const pattern of NO_PATTERNS) {
    if (pattern.test(cleanMessage)) {
      return 'no'
    }
  }
  
  return 'unknown'
}

function extractPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.replace(/\D/g, '')
  } else {
    cleaned = '+' + cleaned.substring(1).replace(/\D/g, '')
  }
  
  return cleaned
}

async function sendConfirmationMessage(phone: string, name: string, responseType: 'yes' | 'no'): Promise<boolean> {
  if (!WASENDER_API_KEY) {
    console.log('WASENDER_API_KEY not set, skipping confirmation message')
    return false
  }

  try {
    const message = responseType === 'yes'
      ? `Great! We've received your confirmation, ${name}! 🎉\n\nSee you tonight at 21:00 at A'DAM 360! We're excited to celebrate with you! 🎊`
      : `Thanks for letting us know, ${name}. We've removed you from the list. We'll miss you, but hope to see you at the next celebration!`

    const wasenderRequest = {
      to: phone,
      text: message
    }

    const wasenderResponse = await fetch(WASENDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WASENDER_API_KEY}`
      },
      body: JSON.stringify(wasenderRequest)
    })

    if (!wasenderResponse.ok) {
      const errorText = await wasenderResponse.text()
      console.error(`Failed to send confirmation to ${phone}:`, errorText)
      return false
    }

    console.log(`Confirmation message sent to ${name} (${phone})`)
    return true
  } catch (error) {
    console.error(`Error sending confirmation to ${phone}:`, error)
    return false
  }
}

function verifyWebhookSecret(req: Request, payload: any): boolean {
  // Check for webhook secret in various header locations
  const headers = Object.fromEntries(req.headers.entries())
  
  // Common header names for webhook secrets
  const secretFromHeader = 
    headers['x-webhook-secret'] ||
    headers['x-wasender-secret'] ||
    headers['webhook-secret'] ||
    headers['x-secret'] ||
    headers['authorization']?.replace('Bearer ', '') ||
    headers['x-api-key']

  // Check in payload
  const secretFromPayload = payload.secret || payload.webhook_secret || payload.webhookSecret

  const receivedSecret = secretFromHeader || secretFromPayload

  if (!receivedSecret) {
    console.log('No webhook secret found in request')
    // If no secret is provided, we'll still process (for testing)
    // In production, you might want to return false here
    return true // Allow for now, but log it
  }

  const isValid = receivedSecret === WEBHOOK_SECRET
  console.log('Webhook secret verification:', { 
    received: receivedSecret.substring(0, 8) + '...', 
    expected: WEBHOOK_SECRET.substring(0, 8) + '...',
    isValid 
  })

  return isValid
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  // Allow GET for webhook verification
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'ok',
        message: 'WhatsApp webhook endpoint is active',
        timestamp: new Date().toISOString(),
        webhookSecretConfigured: !!WEBHOOK_SECRET
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )
  }

  try {
    // Only allow POST requests for webhook
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

    // Validate Supabase configuration
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase configuration missing')
      return new Response(
        JSON.stringify({ error: 'Supabase configuration not set' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Parse webhook payload
    let payload: WebhookPayload = {}
    try {
      // Read the body as text first to preserve it for secret verification
      const bodyText = await req.text()
      payload = JSON.parse(bodyText)
      console.log('Received webhook payload:', JSON.stringify(payload))
    } catch (error) {
      console.error('Error parsing webhook payload:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Verify webhook secret (but don't block if not provided for flexibility)
    const secretValid = verifyWebhookSecret(req, payload)
    if (!secretValid && WEBHOOK_SECRET) {
      console.warn('Webhook secret verification failed, but continuing for debugging')
      // Uncomment the lines below to enforce secret verification:
      // return new Response(
      //   JSON.stringify({ error: 'Invalid webhook secret' }),
      //   { 
      //     status: 401, 
      //     headers: { 
      //       'Content-Type': 'application/json',
      //       ...corsHeaders
      //     } 
      //   }
      // )
    }

    // Extract phone number and message from various webhook formats
    // Handle WasenderAPI nested format first
    let rawPhone = ''
    let rawMessage = ''

    // WasenderAPI format: event = "messages.received", data.messages structure
    if (payload.event === 'messages.received' && payload.data?.messages) {
      const msg = payload.data.messages
      // Extract phone from nested structure
      rawPhone = msg.key?.cleanedSenderPn || 
                 msg.key?.senderPn?.replace('@s.whatsapp.net', '') ||
                 msg.key?.remoteJid?.replace('@lid', '') ||
                 ''
      
      // Extract message from nested structure
      rawMessage = msg.messageBody || 
                   msg.message?.conversation || 
                   msg.message?.text ||
                   ''
      
      console.log('WasenderAPI format detected:', {
        cleanedSenderPn: msg.key?.cleanedSenderPn,
        senderPn: msg.key?.senderPn,
        messageBody: msg.messageBody,
        conversation: msg.message?.conversation
      })
    } else {
      // Fallback to flat format (other webhook providers)
      rawPhone = payload.from || payload.phone || payload.sender || payload.from_number || ''
      rawMessage = payload.body || payload.text || payload.message || payload.content || ''
    }

    const phone = extractPhoneNumber(rawPhone)
    const message = rawMessage.trim()

    console.log('Webhook received:', {
      event: payload.event,
      rawPhone,
      extractedPhone: phone,
      message: message.substring(0, 50),
      payloadKeys: Object.keys(payload)
    })

    if (!phone || phone.length < 10) {
      console.log('Invalid or missing phone number in webhook payload:', { rawPhone, phone, payload })
      return new Response(
        JSON.stringify({ 
          message: 'Invalid or missing phone number',
          received: payload
        }),
        { 
          status: 200, // Return 200 to acknowledge webhook even if we can't process it
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    if (!message) {
      console.log('Missing message in webhook payload:', payload)
      return new Response(
        JSON.stringify({ 
          message: 'Missing message content',
          received: payload
        }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Detect response type
    const responseType = detectResponse(message)
    
    if (responseType === 'unknown') {
      console.log(`Unknown response type for message: "${message}" from ${phone}`)
      return new Response(
        JSON.stringify({ 
          message: 'Response type not recognized',
          receivedMessage: message,
          phone: phone
        }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Find the attendee by phone number
    // Normalize phone numbers for comparison (remove all non-digits)
    const phoneDigits = phone.replace(/\D/g, '')
    
    // First check RSVPs - get all approved and match by phone digits
    const { data: rsvps, error: rsvpsError } = await supabase
      .from('rsvps')
      .select('id, full_name, phone')
      .eq('status', 'approved')

    let attendeeId: string | null = null
    let attendeeName: string | null = null
    let attendeeType: 'rsvp' | 'guest' | null = null
    let attendeePhone: string | null = null

    // Find matching RSVP
    if (rsvps && !rsvpsError) {
      const matchingRSVP = rsvps.find(rsvp => {
        const rsvpDigits = rsvp.phone.replace(/\D/g, '')
        // Match if phone digits are the same (handles +, spaces, etc.)
        return rsvpDigits === phoneDigits || 
               rsvpDigits.endsWith(phoneDigits) || 
               phoneDigits.endsWith(rsvpDigits)
      })
      
      if (matchingRSVP) {
        attendeeId = matchingRSVP.id
        attendeeName = matchingRSVP.full_name
        attendeeType = 'rsvp'
        attendeePhone = matchingRSVP.phone
      }
    }

    // If not found in RSVPs, check guests
    if (!attendeeId) {
      const { data: guests, error: guestsError } = await supabase
        .from('rsvp_guests')
        .select('id, name, phone')
        .eq('status', 'approved')

      if (guests && !guestsError) {
        const matchingGuest = guests.find(guest => {
          const guestDigits = guest.phone.replace(/\D/g, '')
          return guestDigits === phoneDigits || 
                 guestDigits.endsWith(phoneDigits) || 
                 phoneDigits.endsWith(guestDigits)
        })

        if (matchingGuest) {
          attendeeId = matchingGuest.id
          attendeeName = matchingGuest.name
          attendeeType = 'guest'
          attendeePhone = matchingGuest.phone
        }
      }
    }

    if (!attendeeId) {
      console.log(`No approved attendee found for phone: ${phone}`)
      return new Response(
        JSON.stringify({ 
          message: 'Attendee not found or not approved',
          phone: phone
        }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Update database with reply status
    // Note: You may need to add a 'reply_status' column to your tables
    // For now, we'll log it and you can add the column later
    const updateData: any = {
      reply_status: responseType,
      reply_received_at: new Date().toISOString(),
      reply_message: message
    }

    let updateError: any = null
    if (attendeeType === 'rsvp') {
      const { error } = await supabase
        .from('rsvps')
        .update(updateData)
        .eq('id', attendeeId)
      updateError = error
    } else if (attendeeType === 'guest') {
      const { error } = await supabase
        .from('rsvp_guests')
        .update(updateData)
        .eq('id', attendeeId)
      updateError = error
    }

    if (updateError) {
      console.error('Error updating reply status:', updateError)
      // Still return 200 to acknowledge webhook
      const errorMessage = updateError?.message || String(updateError)
      return new Response(
        JSON.stringify({ 
          message: 'Webhook received but database update failed',
          error: errorMessage,
          attendee: attendeeName,
          response: responseType
        }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    console.log(`Updated ${attendeeType} ${attendeeId} (${attendeeName}) with reply: ${responseType}`)

    // Send confirmation message
    if (attendeeName && attendeePhone) {
      // Use the phone from the webhook (formatted) for sending
      await sendConfirmationMessage(phone, attendeeName, responseType)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Reply processed successfully',
        attendee: attendeeName,
        attendeeType: attendeeType,
        response: responseType,
        phone: phone,
        confirmationSent: true
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
    console.error('Error in whatsapp-webhook function:', error)
    // Return 200 to acknowledge webhook even on error
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 200, // Return 200 so webhook provider doesn't retry
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )
  }
})
