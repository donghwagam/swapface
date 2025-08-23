/**
 * Face Swap API service using webhook-based pattern as recommended by API documentation
 * Uses Supabase Edge Function as webhook endpoint for reliable callback handling
 */

export interface Task {
  id: string;
  task_id?: string;
  status: 'queued' | 'processing' | 'succeeded' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  source_image?: string;
  face_image?: string;
  result_image?: string;
  provider?: string;
  credits_used?: number;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface StartFaceSwapResponse {
  ok: boolean;
  id?: string;
  task_id?: string;
  message?: string;
  error?: string;
  detail?: any;
}

export interface TaskStatusResponse {
  ok: boolean;
  task?: Task;
  error?: string;
  detail?: string;
}

const SUPABASE_URL = 'https://afsmkbuspfmhenrccwru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmc21rYnVzcGZtaGVucmNjd3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODcxNzUsImV4cCI6MjA3MTI2MzE3NX0.x2RCn4DBe10CKNC9LZ6CIvwuj__IU5cbxPJd7JJIU-U';

export class FaceSwapAPIService {
  /**
   * Start a new face swap task using webhook-based API as per documentation
   */
  async startFaceSwap(source_image: string, face_image: string): Promise<StartFaceSwapResponse> {
    try {
      console.log('=== 🚀 FACE SWAP START ===');
      console.log('📤 Request details:', {
        endpoint: `${SUPABASE_URL}/functions/v1/aifaceswap-proxy`,
        action: 'faceswap',
        source_image_length: source_image.length,
        face_image_length: face_image.length,
        source_preview: source_image.substring(0, 50) + '...',
        face_preview: face_image.substring(0, 50) + '...'
      });

      const requestBody = {
        action: 'faceswap',
        source_image,
        face_image
      };

      console.log('📨 Sending request to aifaceswap-proxy...');
      const startTime = Date.now();

      // Use Supabase Edge Function as proxy with webhook
      const response = await fetch(`${SUPABASE_URL}/functions/v1/aifaceswap-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestBody)
      });

      const requestDuration = Date.now() - startTime;
      console.log(`⏱️ Request took ${requestDuration}ms`);
      console.log('📡 Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('📋 Raw API response:', JSON.stringify(data, null, 2));

      // Handle proxy API response format
      if (data.code !== 200 || !data.data?.task_id) {
        console.error('❌ Face swap start failed:', data);
        throw new Error(data.message || 'Face swap initiation failed');
      }

      // Validate that we got a proper provider task_id
      const providerTaskId = data.data.task_id;
      console.log('🔍 Provider task_id validation:', {
        task_id: providerTaskId,
        length: providerTaskId?.length,
        is_valid: providerTaskId && providerTaskId.length >= 24,
        type: typeof providerTaskId
      });
      
      if (!providerTaskId || providerTaskId.length < 24) {
        console.warn('⚠️ CRITICAL: task_id does not look like provider task id:', providerTaskId);
        console.warn('⚠️ This will cause webhook matching failure!');
      } else {
        console.log('✅ Valid provider task_id received');
      }

      // Convert proxy response to expected format
      const result = {
        ok: true,
        id: providerTaskId, // Use provider task_id as ID for consistency
        task_id: providerTaskId, // CRITICAL: Must be provider task_id for webhook matching
        message: 'Face swap initiated via webhook'
      };

      console.log('✅ Face swap started successfully:', result);
      console.log('=== END FACE SWAP START ===');
      return result;
    } catch (error) {
      console.error('💥 Face swap start error:', error);
      throw new Error(`Face swap start failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get task status by ID using database lookup (webhook updates database)
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      console.log('📊 Checking task status:', taskId);

      // Import supabase client for direct DB access
      const { supabase } = await import('./supabase');
      
      // Query database for webhook-updated task
      const { data: task, error } = await supabase
        .from('face_swap_tasks')
        .select('*')
        .eq('task_id', taskId)
        .single();
      
      if (error || !task) {
        console.log('📈 Task not found in database');
        return {
          ok: false,
          error: 'Task not found'
        };
      }

      console.log('📈 Found task in database:', task);
      
      // Convert database format to Task interface
      const taskResponse: Task = {
        id: task.id || taskId,
        task_id: task.task_id,
        status: task.status === 'completed' ? 'succeeded' : task.status || 'processing',
        source_image: task.source_image,
        face_image: task.face_image,
        result_image: task.result_image,
        provider: 'aifaceswap',
        credits_used: task.credits_used || 2,
        error: task.error_message,
        created_at: task.created_at,
        updated_at: task.updated_at || task.created_at
      };
      
      return { ok: true, task: taskResponse };
      
    } catch (error) {
      console.error('💥 Task status check error:', error);
      return {
        ok: false,
        error: `Task status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Poll for task completion using database queries (webhook updates database)
   */
  async pollTask(
    taskId: string, 
    options: { 
      intervalMs?: number; 
      maxPolls?: number;
      onUpdate?: (task: Task) => void;
      onTimeout?: () => void;
    } = {}
  ): Promise<Task | null> {
    const interval = options.intervalMs ?? 3000;
    const max = options.maxPolls ?? 120; // 6 minutes with 3s intervals
    
    console.log('=== 🔄 POLLING START ===');
    console.log(`📊 Polling task: ${taskId}`);
    console.log(`📊 Config: ${interval}ms intervals, max ${max} polls (${(max * interval) / 1000}s total)`);
    console.log(`📊 Expecting webhook to update database with task_id: ${taskId}`);

    const startTime = Date.now();

    for (let i = 0; i < max; i++) {
      const pollStartTime = Date.now();
      const elapsedTotal = (pollStartTime - startTime) / 1000;
      
      try {
        console.log(`\n--- Poll ${i + 1}/${max} (${elapsedTotal.toFixed(1)}s elapsed) ---`);
        console.log(`🔍 Checking database for task_id: ${taskId}`);
        
        const response = await this.getTaskStatus(taskId);
        const pollDuration = Date.now() - pollStartTime;
        
        if (!response.ok || !response.task) {
          console.log(`⚠️ Poll ${i + 1}: Task not found or query failed (${pollDuration}ms)`);
          console.log(`❌ Error: ${response.error}`);
          console.log(`💡 Task might still be processing or webhook not received yet`);
          
          // Continue polling - task might not be in database yet
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }

        const task = response.task;
        console.log(`📡 Poll ${i + 1}: Found task (${pollDuration}ms)`, {
          task_id: task.task_id,
          status: task.status,
          hasResult: !!task.result_image,
          error: task.error,
          updated_at: task.updated_at
        });

        // Notify caller of updates
        if (options.onUpdate) {
          options.onUpdate(task);
        }

        // Check for completion states - handle both 'succeeded' and 'completed'
        const isCompleted = ['succeeded', 'completed'].includes(task.status);
        const isFailed = ['failed', 'timeout', 'cancelled'].includes(task.status);
        
        if (isCompleted) {
          console.log(`🎉 SUCCESS! Task completed with status: ${task.status}`);
          console.log(`📸 Result image: ${task.result_image ? 'Available' : 'Missing'}`);
          console.log(`⏱️ Total polling time: ${elapsedTotal.toFixed(1)}s`);
          console.log('=== END POLLING SUCCESS ===');
          return task;
        } else if (isFailed) {
          console.log(`❌ FAILED! Task failed with status: ${task.status}`);
          console.log(`❌ Error: ${task.error}`);
          console.log(`⏱️ Total polling time: ${elapsedTotal.toFixed(1)}s`);
          console.log('=== END POLLING FAILED ===');
          return task;
        }

        console.log(`⏳ Still processing... waiting ${interval}ms before next poll`);
        
        // 🔧 FALLBACK: After 5 polls with no change, try alternative approaches
        if (i >= 4 && i % 5 === 4) {
          console.log(`🔄 FALLBACK: Poll ${i + 1} - Trying alternative status check methods...`);
          console.log(`📊 Fallback triggered: No webhook received after ${i + 1} polls (${((i + 1) * interval) / 1000}s elapsed)`);
          
          // Method 1: Try direct Edge Function API query (secure proxy)
          try {
            console.log(`📡 Method 1: Attempting API query via Edge Function proxy...`);
            const directResponse = await fetch(`${SUPABASE_URL}/functions/v1/aifaceswap-proxy`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                action: 'query',
                task_id: taskId
              })
            });
            
            if (directResponse.ok) {
              const directData = await directResponse.json();
              console.log(`✅ Method 1 success - Proxy API query result:`, directData);
              
              if (directData.code === 200 && directData.data) {
                const apiStatus = directData.data.status;
                const apiResult = directData.data.result_image;
                
                console.log(`📈 Proxy API status: ${apiStatus}, has_result: ${!!apiResult}`);
                
                if (apiStatus === 'completed' && apiResult) {
                  console.log(`🎉 FALLBACK SUCCESS (Method 1): Task completed via proxy API check!`);
                  console.log(`🖼️ Result image found: ${apiResult.substring(0, 50)}...`);
                  
                  return {
                    id: taskId,
                    task_id: taskId,
                    status: 'succeeded',
                    source_image: '',
                    face_image: '',
                    result_image: apiResult,
                    provider: 'aifaceswap',
                    credits_used: 2,
                    error: undefined,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                } else if (apiStatus === 'failed') {
                  console.log(`❌ FALLBACK FAILED (Method 1): Task failed via proxy API check`);
                  return {
                    id: taskId,
                    task_id: taskId,
                    status: 'failed',
                    source_image: '',
                    face_image: '',
                    result_image: '',
                    provider: 'aifaceswap', 
                    credits_used: 2,
                    error: 'Task failed (proxy API check)',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                }
              }
            } else {
              console.warn(`⚠️ Method 1 failed: Edge Function proxy returned ${directResponse.status} ${directResponse.statusText}`);
            }
          } catch (method1Error) {
            console.warn(`⚠️ Method 1 failed with error:`, method1Error);
          }

          // Method 2: Try using the existing task-status Edge Function for database sync
          try {
            console.log(`📡 Method 2: Attempting direct database check via task-status function...`);
            const taskStatusResponse = await fetch(`${SUPABASE_URL}/functions/v1/task-status/${taskId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              }
            });

            if (taskStatusResponse.ok) {
              const taskData = await taskStatusResponse.json();
              console.log(`✅ Method 2 success - Task-status function result:`, taskData);
              
              if (taskData.ok && taskData.task) {
                const taskStatus = taskData.task.status;
                const taskResult = taskData.task.result_image;
                
                console.log(`📈 Task-status function response: ${taskStatus}, has_result: ${!!taskResult}`);
                
                if (['succeeded', 'completed'].includes(taskStatus) && taskResult) {
                  console.log(`🎉 FALLBACK SUCCESS (Method 2): Task completed via task-status function!`);
                  console.log(`🖼️ Result image found: ${taskResult.substring(0, 50)}...`);
                  
                  return {
                    id: taskId,
                    task_id: taskId,
                    status: 'succeeded',
                    source_image: taskData.task.source_image || '',
                    face_image: taskData.task.face_image || '',
                    result_image: taskResult,
                    provider: 'aifaceswap',
                    credits_used: taskData.task.credits_used || 2,
                    error: undefined,
                    created_at: taskData.task.created_at || new Date().toISOString(),
                    updated_at: taskData.task.updated_at || new Date().toISOString()
                  };
                } else if (['failed', 'timeout', 'cancelled'].includes(taskStatus)) {
                  console.log(`❌ FALLBACK FAILED (Method 2): Task failed via task-status function`);
                  
                  return {
                    id: taskId,
                    task_id: taskId,
                    status: 'failed',
                    source_image: taskData.task.source_image || '',
                    face_image: taskData.task.face_image || '',
                    result_image: '',
                    provider: 'aifaceswap', 
                    credits_used: taskData.task.credits_used || 2,
                    error: taskData.task.error || 'Task failed (task-status function check)',
                    created_at: taskData.task.created_at || new Date().toISOString(),
                    updated_at: taskData.task.updated_at || new Date().toISOString()
                  };
                }
              }
            } else {
              console.warn(`⚠️ Method 2 failed: Task-status function returned ${taskStatusResponse.status} ${taskStatusResponse.statusText}`);
            }
          } catch (method2Error) {
            console.warn(`⚠️ Method 2 failed with error:`, method2Error);
          }

          // Method 3: Time-based smart fallback (after 60+ seconds, assume task may be completed externally)
          if (elapsedTotal > 60) {
            console.log(`📡 Method 3: Time-based smart fallback - Task has been processing for ${elapsedTotal.toFixed(1)}s...`);
            console.log(`💡 This could indicate webhook delivery failure. Implementing smart timeout handling.`);
            
            // For now, we'll continue polling but provide better user feedback
            // In a production system, you might want to:
            // 1. Set a max timeout and return a specific error
            // 2. Implement a manual status check UI
            // 3. Send notifications to administrators about webhook failures
          }

          console.log(`⚠️ All fallback methods failed, continuing polling...`);
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, interval));
        
      } catch (error) {
        console.error(`💥 Poll ${i + 1} exception (${elapsedTotal.toFixed(1)}s elapsed):`, error);
        console.log(`🔄 Continuing to next poll despite error...`);
        // Continue polling despite errors
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    const elapsedTotal = (Date.now() - startTime) / 1000;
    console.log(`⏰ TIMEOUT! Polling timeout reached after ${elapsedTotal.toFixed(1)}s`);
    console.log(`❌ Task ${taskId} did not complete within ${max} polls`);
    console.log(`💡 Possible causes: webhook not received, API processing delay, or network issues`);
    console.log('=== END POLLING TIMEOUT ===');
    
    if (options.onTimeout) {
      options.onTimeout();
    }
    
    return null; // Timeout
  }

  /**
   * Upload image to Supabase storage and get public URL
   */
  async uploadImage(file: File): Promise<string> {
    const { uploadImageToSupabase } = await import('./supabase');
    return await uploadImageToSupabase(file);
  }
}

export const faceSwapAPIService = new FaceSwapAPIService();