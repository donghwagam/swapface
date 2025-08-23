import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*"
};

serve(async (req) => {
  console.log("=== AIFACESWAP CALLBACK ===");
  console.log("Time:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Allow webhook calls without authentication (AIFaceSwap external callback)
  console.log("📨 Processing webhook from AIFaceSwap");

  try {
    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Parse webhook payload
    const payload = await req.json();
    console.log("📨 Webhook payload:", payload);
    
    // Expected payload format:
    // { success: 1|0, type: 1|2, task_id: string, result_image?: string }
    const { success, type, task_id, result_image } = payload;
    
    if (!task_id) {
      console.error("❌ Missing task_id in webhook payload");
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing task_id' 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Determine status from success flag
    const status = success === 1 ? 'succeeded' : 'failed';
    
    console.log(`🔄 Updating task ${task_id} with status: ${status}`);
    
    // Use direct REST API call with service_role for reliable upsert
    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/face_swap_tasks`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        task_id: task_id,
        status: status,
        result_image: result_image || null,
        type: type || 2, // 1: single, 2: multi
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }),
    });

    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text();
      console.error("❌ Database upsert failed:", supabaseResponse.status, errorText);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Database error',
        detail: `${supabaseResponse.status}: ${errorText}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const data = await supabaseResponse.json();
    console.log("✅ Task updated successfully:", data);

    // Success response for webhook
    console.log("🎉 Webhook processed successfully");

    return new Response(JSON.stringify({ 
      ok: true,
      message: "Webhook processed successfully"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("💥 Webhook processing error:", error);
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