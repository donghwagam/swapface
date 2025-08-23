import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  console.log('=== AIFaceSwap Proxy Request ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const requestBody = await req.text()
    console.log('Request body:', requestBody)
    
    let parsedBody
    try {
      parsedBody = JSON.parse(requestBody)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if this is a webhook callback (no action field)
    if (!parsedBody.action && parsedBody.task_id) {
      console.log('=== WEBHOOK RECEIVED ===')
      console.log('Webhook data:', parsedBody)
      
      const { success, task_id, result_image, type } = parsedBody
      
      if (!task_id) {
        return new Response(JSON.stringify({ error: 'Missing task_id' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }
      
      let updateData: any = { updated_at: new Date().toISOString() }
      
      if (success === 1) {
        if (result_image) {
          updateData.status = "completed"
          updateData.result_image = result_image
          console.log(`✅ SUCCESS: Task ${task_id} completed`)
        } else {
          updateData.status = "failed"
          updateData.error_message = "No result image provided"
          console.log(`⚠️ PARTIAL SUCCESS: Task ${task_id} no result`)
        }
      } else {
        updateData.status = "failed"
        updateData.error_message = "Provider reported failure"
        console.log(`❌ FAILED: Task ${task_id} failed`)
      }
      
      const { error: dbError } = await supabase
        .from('face_swap_tasks')
        .update(updateData)
        .eq('task_id', task_id)
      
      if (dbError) {
        console.error('❌ Database update failed:', dbError)
        return new Response(JSON.stringify({ error: 'Database update failed' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }
      
      console.log('✅ Webhook processed successfully')
      return new Response(JSON.stringify({ ok: true, message: 'Webhook processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, ...data } = parsedBody
    console.log('Parsed action:', action)
    console.log('Parsed data keys:', Object.keys(data || {}))
    
    const aifaceswapApiKey = Deno.env.get('AIFACESWAP_API_KEY')
    if (!aifaceswapApiKey) {
      console.error('AIFaceSwap API key not found in environment')
      return new Response(
        JSON.stringify({ error: 'AIFaceSwap API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    console.log('API key found:', aifaceswapApiKey.substring(0, 20) + '...')

    const url = new URL(req.url)
    const webhook_url = `${url.origin}/functions/v1/aifaceswap-webhook`

    let apiUrl = ''
    let body = null

    switch (action) {
      case 'faceswap':
        apiUrl = 'https://aifaceswap.io/api/aifaceswap/v1/faceswap'
        body = {
          source_image: data.source_image,
          face_image: data.face_image,
          webhook: webhook_url
        }
        break
      case 'extract_face':
        apiUrl = 'https://aifaceswap.io/api/aifaceswap/v1/extract_face'
        body = {
          img: data.img
        }
        break
      case 'multi_faceswap':
        apiUrl = 'https://aifaceswap.io/api/aifaceswap/v1/multi_faceswap'
        body = {
          source_image: data.source_image,
          face_image: data.face_image,
          index: data.index,
          webhook: webhook_url
        }
        break
      case 'check_status':
      case 'query':
        // Direct API query for task status
        apiUrl = 'https://aifaceswap.io/api/aifaceswap/v1/query'
        body = { task_id: data.task_id }
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
    
    console.log('Making request to AIFaceSwap API:', apiUrl)
    console.log('Request body:', JSON.stringify(body, null, 2))

    const aifaceswapResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aifaceswapApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('AIFaceSwap API response status:', aifaceswapResponse.status)
    
    const responseText = await aifaceswapResponse.text()
    console.log('AIFaceSwap API response body:', responseText)

    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse AIFaceSwap response:', parseError)
      responseData = { error: 'Invalid response from AIFaceSwap API', rawResponse: responseText }
    }

    // Handle different action responses
    if (action === 'faceswap' && responseData.code === 200 && responseData.data?.task_id) {
      // Save new faceswap task to database
      console.log('Saving faceswap task to database:', responseData.data.task_id)
      
      const { error: dbError } = await supabase
        .from('tasks')
        .insert({
          task_id: responseData.data.task_id,
          source_image: data.source_image,
          face_image: data.face_image,
          status: 'processing',
          credits_used: responseData.data.points || 2,
          provider: 'aifaceswap',
          task_type: 'single'
        })

      if (dbError) {
        console.error('Failed to save faceswap task to database (with task_type):', dbError)
        console.log('Retrying insert without new columns...')
        const { error: fallbackError } = await supabase
          .from('tasks')
          .insert({
            task_id: responseData.data.task_id,
            source_image: data.source_image,
            face_image: data.face_image,
            status: 'processing',
            credits_used: responseData.data.points || 2,
            provider: 'aifaceswap'
          })
        if (fallbackError) {
          console.error('Fallback insert also failed:', fallbackError)
        } else {
          console.log('Faceswap task saved to database successfully (fallback)')
        }
      } else {
        console.log('Faceswap task saved to database successfully')
      }
    } else if (action === 'multi_faceswap' && responseData.code === 200 && responseData.data?.task_id) {
      // Save new multi_faceswap task to database
      console.log('Saving multi_faceswap task to database:', responseData.data.task_id)
      
      const { error: dbError } = await supabase
        .from('tasks')
        .insert({
          task_id: responseData.data.task_id,
          source_image: data.source_image,
          face_images: Array.isArray(data.face_image) ? data.face_image : [data.face_image],
          status: 'processing',
          credits_used: responseData.data.points || 5,
          provider: 'aifaceswap',
          task_type: 'multi'
        })

      if (dbError) {
        console.error('Failed to save multi_faceswap task to database (with face_images/task_type):', dbError)
        console.log('Retrying insert without new columns...')
        const { error: fallbackError } = await supabase
          .from('tasks')
          .insert({
            task_id: responseData.data.task_id,
            source_image: data.source_image,
            face_image: (Array.isArray(data.face_image) ? data.face_image[0] : data.face_image),
            status: 'processing',
            credits_used: responseData.data.points || 5,
            provider: 'aifaceswap'
          })
        if (fallbackError) {
          console.error('Fallback insert also failed:', fallbackError)
        } else {
          console.log('Multi_faceswap task saved to database successfully (fallback)')
        }
      } else {
        console.log('Multi_faceswap task saved to database successfully')
      }
    } else if (action === 'check_status' && responseData.code === 200) {
      // Update task status in database based on API response
      const task_id = data.task_id
      console.log('Checking status for task:', task_id)
      console.log('Status API response:', responseData)
      
      if (responseData.data?.status === 'completed' && responseData.data?.result_image) {
        // Task is completed, update database
        console.log('Task completed, updating database')
        
        const { error: dbError } = await supabase
          .from('tasks')
          .update({
            status: 'succeeded',
            result_image: responseData.data.result_image,
            updated_at: new Date().toISOString()
          })
          .eq('task_id', task_id)

        if (dbError) {
          console.error('Failed to update completed task in database:', dbError)
        } else {
          console.log('Task status updated to succeeded in database')
        }
      } else if (responseData.data?.status === 'failed') {
        // Task failed, update database
        console.log('Task failed, updating database')
        
        const { error: dbError } = await supabase
          .from('tasks')
          .update({
            status: 'failed',
            error: responseData.data.error || 'Task processing failed',
            updated_at: new Date().toISOString()
          })
          .eq('task_id', data.task_id)

        if (dbError) {
          console.error('Failed to update failed task in database:', dbError)
        } else {
          console.log('Task status updated to failed in database')
        }
      }
    } else if (action === 'query' && responseData?.code === 200 && responseData?.data) {
      // Query response handling with DB sync
      const st = responseData.data.status;
      const taskId = data.task_id;
      
      console.log(`📊 Query response for ${taskId}: status=${st}`);
      
      if (st === 'completed' && responseData.data.result_image) {
        console.log('🔄 Updating task status to succeeded...');
        
        await supabase.from('tasks').update({
          status: 'succeeded',
          result_image: responseData.data.result_image,
          updated_at: new Date().toISOString()
        }).eq('task_id', taskId);
        
      } else if (st === 'failed') {
        console.log('🔄 Updating task status to failed...');
        
        await supabase.from('tasks').update({
          status: 'failed',
          error: responseData.data?.error || 'Processing failed',
          updated_at: new Date().toISOString()
        }).eq('task_id', taskId);
      }
    }

    return new Response(
      JSON.stringify(responseData),
      {
        status: aifaceswapResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('AIFaceSwap proxy error:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})