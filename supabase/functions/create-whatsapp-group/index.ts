// Supabase Edge Function to create WhatsApp group chat via WasenderAPI
// This function creates a group chat with selected participants

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const WASENDER_API_KEY = Deno.env.get('WASENDER_API_KEY') || ''
// WasenderAPI supports group creation at https://www.wasenderapi.com/api/groups
// Phone numbers must be in JID format: phonenumber@s.whatsapp.net

interface GroupCreationPayload {
  participants: Array<{
    name: string
    phone: string
  }>
  groupName?: string
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
    const payload: GroupCreationPayload = await req.json()

    // Validate required fields
    if (!payload.participants || !Array.isArray(payload.participants) || payload.participants.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one participant is required' }),
        { 
          status: 400, 
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

    // Format phone numbers for WasenderAPI (JID format: phonenumber@s.whatsapp.net)
    // Remove all non-digits, then append @s.whatsapp.net
    const jidParticipants = payload.participants.map(p => {
      // Remove all non-digit characters (including +)
      const digitsOnly = p.phone.replace(/\D/g, '')
      // Format as JID: digits@s.whatsapp.net
      return `${digitsOnly}@s.whatsapp.net`
    })

    const groupName = payload.groupName || 'Toby\'s Birthday Party Group'
    
    // WasenderAPI group creation endpoint
    const wasenderRequest = {
      name: groupName,
      participants: jidParticipants
    }

    console.log('Creating group with WasenderAPI:', { name: groupName, participantCount: jidParticipants.length })

    const wasenderResponse = await fetch('https://www.wasenderapi.com/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WASENDER_API_KEY}`
      },
      body: JSON.stringify(wasenderRequest)
    })

    if (!wasenderResponse.ok) {
      const errorText = await wasenderResponse.text()
      console.error('WasenderAPI error:', errorText, 'Status:', wasenderResponse.status)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create WhatsApp group',
          details: errorText,
          status: wasenderResponse.status
        }),
        { 
          status: wasenderResponse.status || 500, 
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
        message: 'WhatsApp group created successfully',
        groupName: groupName,
        groupId: wasenderResult.id || wasenderResult.group_id,
        participants: payload.participants,
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
    console.error('Error in create-whatsapp-group function:', error)
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
