// Supabase Edge Function to send party reminders to all approved attendees
// This function sends a reminder message with party details, time, and location

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WASENDER_API_URL = 'https://wasenderapi.com/api/send-message'
const WASENDER_API_KEY = Deno.env.get('WASENDER_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Party details
const PARTY_INFO = {
  time: '21:00',
  date: 'February 21st, 2026',
  venue: "A'DAM 360",
  address: 'Overhoeksplein 5, 1031 KS Amsterdam, Netherlands',
  googleMapsLink: 'https://www.google.com/maps/dir/?api=1&destination=Overhoeksplein%205,%201031%20KS%20Amsterdam,%20Netherlands'
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ReminderPayload {
  scheduledTime?: string // Optional: ISO timestamp for scheduled sending
  testMode?: boolean // If true, only send to test phone number
  delayBetweenMessages?: number // Delay in seconds between each message (10-20 seconds)
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

    // Parse optional payload
    let payload: ReminderPayload = {}
    try {
      const body = await req.text()
      if (body) {
        payload = JSON.parse(body)
      }
    } catch {
      // No payload or invalid JSON, use defaults
    }

    // Create Supabase client with service role key for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch all approved RSVPs
    const { data: approvedRSVPs, error: rsvpsError } = await supabase
      .from('rsvps')
      .select('id, full_name, phone')
      .eq('status', 'approved')

    if (rsvpsError) {
      console.error('Error fetching RSVPs:', rsvpsError)
      throw rsvpsError
    }

    // Fetch all approved guests
    const { data: approvedGuests, error: guestsError } = await supabase
      .from('rsvp_guests')
      .select('id, name, phone')
      .eq('status', 'approved')

    if (guestsError) {
      console.error('Error fetching guests:', guestsError)
      throw guestsError
    }

    // Combine all attendees
    const attendees: Array<{ id: string; name: string; phone: string; type: 'rsvp' | 'guest' }> = []

    if (approvedRSVPs) {
      approvedRSVPs.forEach(rsvp => {
        attendees.push({
          id: rsvp.id,
          name: rsvp.full_name,
          phone: rsvp.phone,
          type: 'rsvp'
        })
      })
    }

    if (approvedGuests) {
      approvedGuests.forEach(guest => {
        attendees.push({
          id: guest.id,
          name: guest.name,
          phone: guest.phone,
          type: 'guest'
        })
      })
    }

    if (attendees.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No approved attendees found',
          sent: 0
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

    // Test mode: only send to specific test phone number
    const TEST_PHONE = '+31620737097'
    let recipients: Array<{ id: string; name: string; phone: string; type: 'rsvp' | 'guest' }> = []
    
    if (payload.testMode) {
      // Find the test phone number in attendees
      const testAttendee = attendees.find(attendee => {
        const phoneDigits = attendee.phone.replace(/\D/g, '')
        const testDigits = TEST_PHONE.replace(/\D/g, '')
        return phoneDigits === testDigits || phoneDigits.endsWith(testDigits) || testDigits.endsWith(phoneDigits)
      })
      
      if (testAttendee) {
        recipients = [testAttendee]
      } else {
        // If not found, create a dummy entry for testing
        recipients = [{
          id: 'test',
          name: 'Test User',
          phone: TEST_PHONE,
          type: 'rsvp'
        }]
      }
    } else {
      recipients = attendees
    }
    
    // Get delay between messages (default 15 seconds, between 10-20)
    const delaySeconds = payload.delayBetweenMessages 
      ? Math.max(10, Math.min(20, payload.delayBetweenMessages))
      : 15

    // Create reminder message
    const reminderMessage = `🎉 *Party Reminder - Tonight!* 🎉

Hi! Just a friendly reminder that Toby's 22nd Birthday Party is *TONIGHT* at ${PARTY_INFO.time}!

📍 *Location:* ${PARTY_INFO.venue}
${PARTY_INFO.address}

🗺️ *Get Directions:*
${PARTY_INFO.googleMapsLink}

⏰ *Time:* ${PARTY_INFO.time} (21:00)
📅 *Date:* ${PARTY_INFO.date}

We're excited to celebrate with you! See you there! 🎊

Reply YES if you're coming, or NO if you can't make it.`

    // Send reminders sequentially with delay between each message
    const results: Array<{ name: string; phone: string; success: boolean; error?: string }> = []
    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < recipients.length; i++) {
      const attendee = recipients[i]
      
      // Format phone number for WasenderAPI (ensure it starts with +)
      let formattedPhone = attendee.phone.trim()
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone.replace(/\D/g, '')
      } else {
        formattedPhone = '+' + formattedPhone.substring(1).replace(/\D/g, '')
      }

      try {
        const wasenderRequest = {
          to: formattedPhone,
          text: reminderMessage.replace('Hi!', `Hi ${attendee.name}!`)
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
          console.error(`Failed to send to ${attendee.name} (${formattedPhone}):`, errorText)
          results.push({
            name: attendee.name,
            phone: formattedPhone,
            success: false,
            error: errorText
          })
          failureCount++
        } else {
          console.log(`Successfully sent reminder to ${attendee.name} (${formattedPhone})`)
          results.push({
            name: attendee.name,
            phone: formattedPhone,
            success: true
          })
          successCount++
        }
      } catch (error) {
        console.error(`Error sending to ${attendee.name}:`, error)
        results.push({
          name: attendee.name,
          phone: formattedPhone,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
        failureCount++
      }

      // Add delay between messages (except after the last one)
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000))
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Reminders sent to ${successCount} out of ${recipients.length} attendees`,
        total: recipients.length,
        sent: successCount,
        failed: failureCount,
        results: results,
        testMode: payload.testMode || false,
        delayBetweenMessages: delaySeconds
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
    console.error('Error in send-party-reminder function:', error)
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
