import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*"
};

serve(async (req) => {
  console.log("=== 📊 TASK STATUS API ===");
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
    console.log("=== 🔍 TASK ID EXTRACTION ===");
    const url = new URL(req.url);
    const taskId = url.pathname.split('/').pop(); // Get task ID from URL path
    
    console.log("🎯 URL parsing:", {
      pathname: url.pathname,
      path_segments: url.pathname.split('/'),
      extracted_task_id: taskId
    });
    
    if (!taskId) {
      console.error("❌ Missing task ID in URL path");
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing task ID in URL path' 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("=== 🔧 SUPABASE INITIALIZATION ===");
    // Initialize Supabase with service role key for read access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log("🔑 Supabase initialization:", {
      url: supabaseUrl ? 'configured' : 'missing',
      service_key: supabaseServiceKey ? 'configured' : 'missing'
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("=== 💾 DATABASE LOOKUP ===");
    console.log("🔍 Looking up task:", taskId);

    // Query task by ID (UUID) or task_id (provider ID)
    let query = supabase.from('tasks').select('*');
    
    // Check if taskId looks like UUID or provider task_id
    const isUUID = taskId.includes('-') && taskId.length === 36;
    const queryType = isUUID ? 'internal_id' : 'provider_task_id';
    
    console.log("🎯 Query strategy:", {
      task_id: taskId,
      looks_like_uuid: isUUID,
      query_type: queryType,
      length: taskId.length
    });
    
    if (isUUID) {
      query = query.eq('id', taskId);
    } else {
      query = query.eq('task_id', taskId);
    }

    console.log("📤 Executing database query...");
    const queryStartTime = Date.now();
    const { data: task, error } = await query.single();
    const queryDuration = Date.now() - queryStartTime;
    console.log(`⏱️ Database query took ${queryDuration}ms`);

    if (error || !task) {
      console.error("❌ Task lookup failed:", {
        error: error,
        has_task: !!task,
        query_type: queryType,
        task_id: taskId
      });
      
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Task not found',
        detail: error?.message 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Task found successfully!");
    console.log("📊 Task details:", {
      internal_id: task.id,
      provider_task_id: task.task_id,
      status: task.status,
      provider: task.provider,
      has_result: !!task.result_image,
      has_error: !!task.error,
      created_at: task.created_at,
      updated_at: task.updated_at,
      credits_used: task.credits_used
    });

    const response = { 
      ok: true, 
      task: task 
    };
    
    console.log("📤 Sending success response");
    console.log("=== END TASK STATUS SUCCESS ===");

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("💥 Task status error:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    console.log("=== END TASK STATUS FAILED ===");
    
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