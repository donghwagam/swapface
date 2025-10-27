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

    // Use environment variables for security
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("📝 Preparing update data for tasks table...");

    const updateTasks = {
      updated_at: new Date().toISOString(),
      ...(result_image ? { result_image } : {}),
      status: (success === 1 && result_image) ? 'succeeded' : 'failed',
      ...(success === 1 && !result_image ? { error: 'No result image provided' } : {}),
      ...(success === 0 ? { error: 'Provider reported failure (success=0)' } : {})
    };

    const { data: tRows, error: tErr } = await supabase
      .from('tasks')
      .update(updateTasks)
      .eq('task_id', task_id)
      .select();

    if (tErr) {
      console.error('tasks update error:', tErr);
      return new Response(JSON.stringify({ ok: false, error: 'Database update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!tRows || tRows.length === 0) {
      console.error('No task found in tasks for task_id:', task_id);
      return new Response(JSON.stringify({ ok: false, error: 'Task not found', task_id }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Updated tasks table:', { task_id, status: updateTasks.status, has_result: !!updateTasks.result_image });

    return new Response(JSON.stringify({ 
      ok: true, 
      task_id, 
      status: success === 1 && result_image ? 'succeeded' : 'failed', 
      result_available: !!result_image
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