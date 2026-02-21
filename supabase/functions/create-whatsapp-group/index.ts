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
  groupJid?: string // Optional: if provided, add participants to existing group instead of creating new one
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
      
      // Validate we have digits
      if (!digitsOnly || digitsOnly.length < 10) {
        throw new Error(`Invalid phone number: ${p.phone} (name: ${p.name})`)
      }
      
      // Format as JID: digits@s.whatsapp.net
      return `${digitsOnly}@s.whatsapp.net`
    })
    
    // Log formatted participants for debugging
    console.log('Formatted participants:', jidParticipants)

    const groupName = payload.groupName || 'Toby\'s Birthday Party Group'
    
    console.log('API Key present:', !!WASENDER_API_KEY, 'Key length:', WASENDER_API_KEY.length)
    console.log('Total participant count:', jidParticipants.length)

    let groupJid: string
    let createResult: any = null

    // Check if using existing group or creating new one
    if (payload.groupJid) {
      // Use existing group
      groupJid = payload.groupJid
      console.log('Using existing group JID:', groupJid)
    } else {
      // Step 1: Create group with just the first participant (or empty if API allows)
      // This avoids timeout when creating with many participants at once
      const initialParticipants = jidParticipants.length > 0 ? [jidParticipants[0]] : []
      
      console.log('Step 1: Creating group with initial participant...')
      const createGroupRequest = {
        name: groupName,
        participants: initialParticipants
      }

      let createResponse: Response
      let createResponseText: string
      
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout for group creation

        createResponse = await fetch('https://www.wasenderapi.com/api/groups', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WASENDER_API_KEY}`
          },
          body: JSON.stringify(createGroupRequest),
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        createResponseText = await createResponse.text()
      } catch (error: any) {
        console.error('Error creating group:', error)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create group',
            details: error.message || String(error)
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

      if (!createResponse.ok) {
        let errorDetails
        try {
          errorDetails = JSON.parse(createResponseText)
        } catch {
          errorDetails = createResponseText
        }
        
        console.error('Failed to create group:', errorDetails)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create WhatsApp group',
            details: errorDetails,
            status: createResponse.status
          }),
          { 
            status: createResponse.status || 500, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            } 
          }
        )
      }

      try {
        createResult = JSON.parse(createResponseText)
      } catch (e) {
        console.error('Failed to parse group creation response:', createResponseText)
        return new Response(
          JSON.stringify({ 
            error: 'Invalid response from WasenderAPI',
            details: createResponseText
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

      // Extract group JID from response
      groupJid = createResult.id || createResult.group_id || createResult.jid
      if (!groupJid) {
        console.error('No group JID in response:', createResult)
        return new Response(
          JSON.stringify({ 
            error: 'Group created but no group ID returned',
            details: createResult
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

      console.log('Group created successfully with JID:', groupJid)
    }

    // Step 2: Add participants in batches
    // If using existing group, add all participants. Otherwise, add remaining ones.
    const participantsToAdd = payload.groupJid ? jidParticipants : jidParticipants.slice(1)
    
    if (participantsToAdd.length > 0) {
      console.log(`Step 2: Adding ${participantsToAdd.length} participants in batches...`)
      
      const batchSize = 5 // Add 5 participants at a time to avoid timeouts
      const batches: string[][] = []
      
      for (let i = 0; i < participantsToAdd.length; i += batchSize) {
        batches.push(participantsToAdd.slice(i, i + batchSize))
      }

      console.log(`Adding participants in ${batches.length} batches of up to ${batchSize} each`)

      const addResults: Array<{ batch: number; success: boolean; error?: any }> = []

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        console.log(`Adding batch ${i + 1}/${batches.length} with ${batch.length} participants...`)

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout per batch

          const addResponse = await fetch(`https://www.wasenderapi.com/api/groups/${groupJid}/participants/add`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${WASENDER_API_KEY}`
            },
            body: JSON.stringify({ participants: batch }),
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          const addResponseText = await addResponse.text()

          if (!addResponse.ok) {
            let errorDetails
            try {
              errorDetails = JSON.parse(addResponseText)
            } catch {
              errorDetails = addResponseText
            }
            
            console.error(`Failed to add batch ${i + 1}:`, errorDetails)
            addResults.push({ batch: i + 1, success: false, error: errorDetails })
          } else {
            console.log(`Successfully added batch ${i + 1}`)
            addResults.push({ batch: i + 1, success: true })
          }

          // Small delay between batches to avoid rate limiting
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
          }

        } catch (error: any) {
          console.error(`Error adding batch ${i + 1}:`, error)
          addResults.push({ batch: i + 1, success: false, error: error.message || String(error) })
        }
      }

      const failedBatches = addResults.filter(r => !r.success)
      if (failedBatches.length > 0) {
        console.warn(`${failedBatches.length} batches failed to add participants`)
        // Continue anyway - group was created, some participants may have been added
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: payload.groupJid 
          ? 'Participants added to existing group successfully' 
          : 'WhatsApp group created successfully',
        groupName: groupName,
        groupId: groupJid,
        totalParticipants: jidParticipants.length,
        participantsAdded: payload.groupJid 
          ? `${participantsToAdd.length} added in batches` 
          : (participantsToAdd.length > 0 
            ? `1 initially, ${participantsToAdd.length} added in batches` 
            : `${jidParticipants.length} initially`),
        wasenderResponse: createResult
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
