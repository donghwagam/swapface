import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*"
};

type WebhookBody = {
  success: 0 | 1;
  type: 1 | 2;
  task_id: string;
  result_image?: string;
};

serve(async (req) => {
  console.log("=== WEBHOOK RECEIVED ===");
  console.log("Time:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  console.log("User-Agent:", req.headers.get("user-agent"));
  
  // Always allow CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Allow webhook calls without authentication for AIFaceSwap.io
  // (External webhooks don't have Supabase auth headers)
  console.log("🔓 Allowing unauthenticated webhook from AIFaceSwap.io");

  try {
    const rawBody = await req.text();
    console.log("=== RAW BODY ===");
    console.log(rawBody);
    console.log("=== END RAW BODY ===");
    
    let webhookData: WebhookBody;
    try {
      webhookData = JSON.parse(rawBody) as WebhookBody;
      console.log("=== PARSED WEBHOOK DATA ===");
      console.log(JSON.stringify(webhookData, null, 2));
      console.log("=== END PARSED DATA ===");
    } catch (parseError) {
      console.error("JSON parse failed:", parseError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Invalid JSON payload' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { success, task_id, result_image, type } = webhookData;

    if (!task_id) {
      console.error("No task_id provided");
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing task_id in webhook payload' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate webhook payload structure
    if (typeof success !== 'number' || (success !== 0 && success !== 1)) {
      console.error("Invalid success value:", success);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Invalid success value in webhook payload' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Processing task: ${task_id}, success: ${success}, type: ${type}, result: ${result_image}`);

    // Use Supabase client instead of direct REST API
    const supabaseUrl = 'https://afsmkbuspfmhenrccwru.supabase.co';
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmc21rYnVzcGZtaGVucmNjd3J1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NzE3NSwiZXhwIjoyMDcxMjYzMTc1fQ.9QE4Hj86rUCy6vxQpppJG9-QlzQY7kSbZHI5oFyKvUU';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare update data based on webhook result
    let updateData: any = { 
      updated_at: new Date().toISOString()
    };

    if (success === 1) {
      if (result_image) {
        updateData.status = "completed";
        updateData.result_image = result_image;
        console.log(`✅ SUCCESS: Task ${task_id} completed with image: ${result_image}`);
      } else {
        updateData.status = "failed";
        updateData.error_message = "No result image provided despite success=1";
        console.log(`⚠️ PARTIAL SUCCESS: Task ${task_id} marked as success but no result image`);
      }
    } else {
      updateData.status = "failed";
      updateData.error_message = "Provider reported failure (success=0)";
      console.log(`❌ FAILED: Task ${task_id} failed (success=0)`);
    }

    console.log("📝 Updating database with:", updateData);

    // Update task in database using Supabase client
    const { data: dbData, error: dbError } = await supabase
      .from('face_swap_tasks')
      .update(updateData)
      .eq('task_id', task_id)
      .select()
      .single();

    if (dbError) {
      console.error("❌ Database update failed:", dbError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Database update failed',
        detail: dbError.message
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!dbData) {
      console.error("⚠️ No task found with task_id:", task_id);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Task not found',
        task_id: task_id
      }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Database updated successfully:", {
      id: dbData.id,
      task_id: dbData.task_id,
      status: dbData.status,
      has_result: !!dbData.result_image
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      message: "Webhook processed successfully",
      task_id: task_id,
      status: dbData.status,
      result_available: !!dbData.result_image
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("💥 Webhook error:", error);
    return new Response(JSON.stringify({
      ok: false,
      error: "Webhook processing failed",
      message: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});