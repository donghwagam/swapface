import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*"
};

serve(async (req) => {
  console.log("=== TASK STATUS API ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const taskId = url.pathname.split('/').pop(); // Get task ID from URL path
    
    if (!taskId) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing task ID in URL path' 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Initialize Supabase with service role key for read access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔍 Looking up task:", taskId);

    // Query task by ID (UUID) or task_id (provider ID)
    let query = supabase.from('tasks').select('*');
    
    // Check if taskId looks like UUID or provider task_id
    if (taskId.includes('-') && taskId.length === 36) {
      query = query.eq('id', taskId);
    } else {
      query = query.eq('task_id', taskId);
    }

    const { data: task, error } = await query.single();

    if (error || !task) {
      console.log("❌ Task not found:", error);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Task not found',
        detail: error?.message 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Task found:", {
      id: task.id,
      task_id: task.task_id,
      status: task.status,
      has_result: !!task.result_image
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      task: task 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("💥 Task status error:", error);
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