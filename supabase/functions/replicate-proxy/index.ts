import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { method, endpoint, body } = await req.json()
    
    const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN')
    if (!replicateApiToken) {
      return new Response(
        JSON.stringify({ error: 'Replicate API token not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const url = `https://api.replicate.com/v1${endpoint}`
    
    const replicateResponse = await fetch(url, {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${replicateApiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const responseData = await replicateResponse.json()

    return new Response(
      JSON.stringify(responseData),
      {
        status: replicateResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Replicate proxy error:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})