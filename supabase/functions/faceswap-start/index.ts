import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*"
};

serve(async (req) => {
  console.log("=== 🚀 FACE SWAP START API ===");
  console.log("🕒 Time:", new Date().toISOString());
  console.log("📝 Method:", req.method);
  console.log("🔗 URL:", req.url);
  console.log("📋 Headers:", Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("✅ CORS preflight handled");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("=== 🔧 INITIALIZATION ===");
    
    // Initialize Supabase with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log("🔑 Supabase initialization:", {
      url: supabaseUrl ? 'configured' : 'missing',
      service_key: supabaseServiceKey ? 'configured' : 'missing'
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const aifaceswapApiKey = Deno.env.get('AIFACESWAP_API_KEY');
    console.log("🔑 AIFaceSwap API key:", aifaceswapApiKey ? 'configured' : 'missing');
    if (!aifaceswapApiKey) {
      console.error("❌ AIFaceSwap API key not configured");
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'AIFaceSwap API key not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();
    console.log("🎯 Endpoint detected:", endpoint);
    
    // Handle extract_face endpoint with file upload
    if (endpoint === 'extract_face') {
      console.log("=== 🔍 EXTRACT FACE ENDPOINT ===");
      console.log("📤 Processing face extraction request...");
      
      const formData = await req.formData();
      console.log("📋 FormData keys:", Array.from(formData.keys()));
      
      const imageFile = formData.get('img') as File;
      
      if (!imageFile) {
        console.error("❌ Missing image file in formData");
        return new Response(JSON.stringify({ 
          code: 400, 
          message: 'Missing image file' 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      console.log("📸 Processing image file:", {
        name: imageFile.name,
        size: `${(imageFile.size / 1024 / 1024).toFixed(2)}MB`,
        type: imageFile.type,
        lastModified: new Date(imageFile.lastModified).toISOString()
      });
      
      console.log("📤 Forwarding to AIFaceSwap extract_face API...");
      const extractStartTime = Date.now();
      
      // Forward file to AIFaceSwap extract_face API
      const extractFormData = new FormData();
      extractFormData.append('img', imageFile);
      console.log("🔄 FormData prepared for AIFaceSwap API");
      
      const extractResponse = await fetch('https://aifaceswap.io/api/aifaceswap/v1/extract_face', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aifaceswapApiKey}`
        },
        body: extractFormData
      });
      
      const extractDuration = Date.now() - extractStartTime;
      console.log(`⏱️ AIFaceSwap extract_face request took ${extractDuration}ms`);
      console.log("📡 Extract response status:", extractResponse.status, extractResponse.statusText);
      
      // Enhanced error logging
      let bodyText = '';
      try { 
        bodyText = await extractResponse.text(); 
        console.log("📋 Raw response length:", bodyText.length);
      } catch (e) {
        console.error("❌ Failed to read response body:", e);
      }
      
      let payload: any = null;
      try { 
        payload = JSON.parse(bodyText); 
        console.log("✅ Response JSON parsed successfully");
      } catch (e) {
        console.error("❌ Failed to parse JSON response:", bodyText?.slice(0, 500));
      }
      
      if (!extractResponse.ok || (payload && payload.code && payload.code !== 200)) {
        console.error('❌ AIFaceSwap extract_face error detail:', {
          status: extractResponse.status,
          statusText: extractResponse.statusText,
          response_code: payload?.code,
          message: payload?.message,
          bodyText: bodyText?.slice(0, 500)
        });
      } else {
        console.log("✅ AIFaceSwap extract_face success:", {
          code: payload?.code,
          message: payload?.message,
          faces_detected: payload?.data?.faces?.length || 0,
          has_data: !!payload?.data
        });
      }
      
      console.log("=== END EXTRACT FACE ENDPOINT ===");
      return new Response(JSON.stringify(payload ?? {}), {
        status: extractResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("=== 🎭 FACE SWAP ENDPOINT ===");
    console.log("📤 Processing face swap request...");
    
    const requestBody = await req.text();
    console.log("📋 Request body length:", requestBody.length);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(requestBody);
      console.log("✅ Request JSON parsed successfully");
    } catch (error) {
      console.error("❌ Failed to parse request JSON:", error);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Invalid JSON in request body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const { source_image, face_image } = parsedBody;
    
    console.log("🔍 Request validation:", {
      has_source_image: !!source_image,
      has_face_image: !!face_image,
      source_image_length: source_image?.length || 0,
      face_image_length: face_image?.length || 0,
      source_preview: source_image?.substring(0, 50) + '...' || 'missing',
      face_preview: face_image?.substring(0, 50) + '...' || 'missing'
    });
    
    if (!source_image || !face_image) {
      console.error("❌ Missing required images:", {
        source_image: !!source_image,
        face_image: !!face_image
      });
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing source_image or face_image' 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("=== 💾 DATABASE OPERATIONS ===");
    console.log("📝 Creating task in database...");
    const dbInsertStartTime = Date.now();
    
    // 1) Create task in our database first (processing state)
    const { data: task, error: dbError } = await supabase
      .from('tasks')
      .insert({
        status: 'processing',
        source_image,
        face_image,
        provider: 'aifaceswap'
      })
      .select()
      .single();

    const dbInsertDuration = Date.now() - dbInsertStartTime;
    console.log(`⏱️ Database insert took ${dbInsertDuration}ms`);

    if (dbError || !task) {
      console.error("❌ Database insert failed:", {
        error: dbError,
        has_task: !!task
      });
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Database error', 
        detail: dbError?.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Task created successfully:", {
      task_id: task.id,
      status: task.status,
      provider: task.provider,
      created_at: task.created_at
    });

    console.log("=== 🤖 AIFACESWAP API CALL ===");
    
    // 2) Call AIFaceSwap.io API with webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/aifaceswap-webhook`;
    console.log("🔗 Webhook URL:", webhookUrl);
    console.log("📤 Calling AIFaceSwap.io face swap API...");
    
    const apiStartTime = Date.now();
    const requestPayload = {
      source_image,
      face_image,
      webhook: webhookUrl
    };
    
    console.log("📋 API request payload:", {
      source_image_length: source_image.length,
      face_image_length: face_image.length,
      webhook: webhookUrl,
      source_preview: source_image.substring(0, 50) + '...',
      face_preview: face_image.substring(0, 50) + '...'
    });
    
    const aifaceswapResponse = await fetch('https://aifaceswap.io/api/aifaceswap/v1/faceswap', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aifaceswapApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    const apiDuration = Date.now() - apiStartTime;
    console.log(`⏱️ AIFaceSwap API request took ${apiDuration}ms`);
    console.log("📡 API response status:", aifaceswapResponse.status, aifaceswapResponse.statusText);

    const aifaceswapData = await aifaceswapResponse.json();
    console.log("🤖 AIFaceSwap API response:", {
      code: aifaceswapData?.code,
      message: aifaceswapData?.message,
      has_data: !!aifaceswapData?.data,
      task_id: aifaceswapData?.data?.task_id,
      points: aifaceswapData?.data?.points
    });

    if (!aifaceswapResponse.ok || aifaceswapData?.code !== 200) {
      console.error("❌ AIFaceSwap API failed:", {
        response_ok: aifaceswapResponse.ok,
        response_status: aifaceswapResponse.status,
        response_code: aifaceswapData?.code,
        message: aifaceswapData?.message,
        full_response: aifaceswapData
      });
      
      console.log("💾 Updating task to failed status...");
      
      // Update task to failed status
      await supabase
        .from('tasks')
        .update({
          status: 'failed',
          error: `provider_error: ${aifaceswapResponse.status} ${JSON.stringify(aifaceswapData)}`
        })
        .eq('id', task.id);
      
      console.log("❌ Task marked as failed due to provider error");
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Provider error', 
        detail: aifaceswapData 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("=== 🔍 TASK_ID VALIDATION ===");
    
    // 3) Update task with provider task_id - CRITICAL for webhook matching
    const providerTaskId = aifaceswapData.data?.task_id;
    console.log("🔍 Provider task_id validation:", {
      task_id: providerTaskId,
      length: providerTaskId?.length,
      is_valid: providerTaskId && providerTaskId.length >= 24,
      type: typeof providerTaskId
    });
    
    if (!providerTaskId) {
      console.error('❌ CRITICAL: Provider did not return task_id!', {
        has_data: !!aifaceswapData.data,
        data_keys: aifaceswapData.data ? Object.keys(aifaceswapData.data) : [],
        full_response: aifaceswapData
      });
      
      await supabase.from('tasks').update({
        status: 'failed',
        error: 'provider_error: missing task_id'
      }).eq('id', task.id);
      
      return new Response(JSON.stringify({ ok: false, error: 'Provider missing task_id' }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    if (providerTaskId.length < 24) {
      console.warn('⚠️ WARNING: task_id looks suspicious:', {
        task_id: providerTaskId,
        length: providerTaskId.length,
        expected_length: '>=24'
      });
    } else {
      console.log('✅ Valid provider task_id received');
    }

    console.log("💾 Updating task with provider task_id...");
    const dbUpdateStartTime = Date.now();
    
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        task_id: providerTaskId,
        credits_used: aifaceswapData.data?.points || 2
      })
      .eq('id', task.id);

    const dbUpdateDuration = Date.now() - dbUpdateStartTime;
    console.log(`⏱️ Database update took ${dbUpdateDuration}ms`);

    if (updateError) {
      console.error("⚠️ Failed to update task_id:", {
        error: updateError,
        task_id: task.id,
        provider_task_id: providerTaskId
      });
    } else {
      console.log("✅ Task updated successfully with provider task_id:", {
        internal_id: task.id,
        provider_task_id: providerTaskId,
        credits_used: aifaceswapData.data?.points || 2
      });
    }

    const finalResponse = { 
      ok: true, 
      id: task.id, 
      task_id: providerTaskId,   // CRITICAL: This must be provider task_id for webhook matching
      message: "Face swap initiated via webhook"
    };
    
    console.log("📤 Final success response:", finalResponse);
    console.log("=== END FACE SWAP START SUCCESS ===");

    return new Response(JSON.stringify(finalResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("💥 Face swap start error:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    console.log("=== END FACE SWAP START FAILED ===");
    
    return new Response(JSON.stringify({
      ok: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});