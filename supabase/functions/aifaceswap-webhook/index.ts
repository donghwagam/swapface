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
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    let webhookData: WebhookBody;
    try {
      webhookData = JSON.parse(rawBody) as WebhookBody;
    } catch (parseError) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload' }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { success, task_id, result_image } = webhookData;

    if (!task_id) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing task_id' }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (success === 1) {
      if (result_image) {
        updateData.status = 'succeeded';
        updateData.result_image = result_image;
      } else {
        // Be conservative: keep processing if no result yet
        updateData.status = 'processing';
      }
    } else {
      updateData.status = 'failed';
      updateData['error'] = 'Provider reported failure (success=0)';
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('task_id', task_id)
      .select();

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: 'Database update failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Task not found', task_id }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      task_id, 
      status: updateData.status, 
      result_available: !!result_image
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Webhook processing failed",
      message: (error as Error).message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});