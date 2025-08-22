import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*"
};

serve(async (req) => {
  console.log("=== FACE SWAP START API ===");
  console.log("Time:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const aifaceswapApiKey = Deno.env.get('AIFACESWAP_API_KEY');
    if (!aifaceswapApiKey) {
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
    
    // Handle extract_face endpoint with file upload
    if (endpoint === 'extract_face') {
      console.log("🔍 Extract face endpoint called");
      
      const formData = await req.formData();
      const imageFile = formData.get('img') as File;
      
      if (!imageFile) {
        return new Response(JSON.stringify({ 
          code: 400, 
          message: 'Missing image file' 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      console.log("📸 Processing image file:", imageFile.name, imageFile.size);
      
      // Forward file to AIFaceSwap extract_face API
      const extractFormData = new FormData();
      extractFormData.append('img', imageFile);
      
      const extractResponse = await fetch('https://aifaceswap.io/api/aifaceswap/v1/extract_face', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aifaceswapApiKey}`
        },
        body: extractFormData
      });
      
      // Enhanced error logging
      let bodyText = '';
      try { 
        bodyText = await extractResponse.text(); 
      } catch (e) {
        console.error("❌ Failed to read response body:", e);
      }
      
      let payload: any = null;
      try { 
        payload = JSON.parse(bodyText); 
      } catch (e) {
        console.error("❌ Failed to parse JSON response:", bodyText?.slice(0, 500));
      }
      
      if (!extractResponse.ok || (payload && payload.code && payload.code !== 200)) {
        console.error('❌ AIFaceSwap extract_face error detail:', {
          status: extractResponse.status,
          statusText: extractResponse.statusText,
          bodyText: bodyText?.slice(0, 500),
          payload: payload
        });
      } else {
        console.log("✅ AIFaceSwap extract_face success:", payload);
      }
      
      return new Response(JSON.stringify(payload ?? {}), {
        status: extractResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { source_image, face_image } = await req.json();
    
    if (!source_image || !face_image) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing source_image or face_image' 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("📝 Creating task in database...");
    
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

    if (dbError || !task) {
      console.error("❌ Database insert failed:", dbError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Database error', 
        detail: dbError?.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Task created:", task.id);

    // 2) Call AIFaceSwap.io API with webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/aifaceswap-webhook`;
    console.log("🔗 Webhook URL:", webhookUrl);
    
    const aifaceswapResponse = await fetch('https://aifaceswap.io/api/aifaceswap/v1/faceswap', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aifaceswapApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_image,
        face_image,
        webhook: webhookUrl
      })
    });

    const aifaceswapData = await aifaceswapResponse.json();
    console.log("🤖 AIFaceSwap response:", aifaceswapData);

    if (!aifaceswapResponse.ok || aifaceswapData?.code !== 200) {
      console.error("❌ AIFaceSwap API failed:", aifaceswapData);
      
      // Update task to failed status
      await supabase
        .from('tasks')
        .update({
          status: 'failed',
          error: `provider_error: ${aifaceswapResponse.status} ${JSON.stringify(aifaceswapData)}`
        })
        .eq('id', task.id);
      
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Provider error', 
        detail: aifaceswapData 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3) Update task with provider task_id
    const providerTaskId = aifaceswapData.data?.task_id;
    if (providerTaskId) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          task_id: providerTaskId,
          credits_used: aifaceswapData.data?.points || 2
        })
        .eq('id', task.id);

      if (updateError) {
        console.error("⚠️ Failed to update task_id:", updateError);
      } else {
        console.log("✅ Task updated with provider task_id:", providerTaskId);
      }
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      id: task.id, 
      task_id: providerTaskId,
      message: "Face swap initiated successfully. Waiting for webhook result."
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("💥 Face swap start error:", error);
    return new Response(JSON.stringify({
      ok: false,
      error: "Internal server error",
      message: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});