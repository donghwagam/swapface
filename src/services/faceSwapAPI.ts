/**
 * Improved Face Swap API service using server-side pattern
 * Based on reference architecture for better reliability and security
 */

export interface Task {
  id: string;
  task_id?: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'timeout' | 'cancelled';
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
   * Start a new face swap task using server-side API
   */
  async startFaceSwap(source_image: string, face_image: string): Promise<StartFaceSwapResponse> {
    try {
      console.log('🚀 Starting face swap via proxy API (fallback)...');
      console.log('Source image length:', source_image.length);
      console.log('Face image length:', face_image.length);

      // Fallback to existing proxy until new functions are deployed
      const response = await fetch(`${SUPABASE_URL}/functions/v1/aifaceswap-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'faceswap',
          data: {
            source_image,
            face_image
          }
        })
      });

      const data = await response.json();
      console.log('📋 Start face swap response:', data);

      // Handle proxy API response format
      if (data.code !== 200 || !data.data?.task_id) {
        console.error('❌ Face swap start failed:', data);
        throw new Error(data.message || 'Face swap initiation failed');
      }

      // Convert proxy response to expected format
      return {
        ok: true,
        id: data.data.task_id, // Use provider task_id as our ID for now
        task_id: data.data.task_id,
        message: 'Face swap initiated via proxy API'
      };
    } catch (error) {
      console.error('💥 Face swap start error:', error);
      throw new Error(`Face swap start failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get task status by ID (UUID or provider task_id) - using direct database access
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      console.log('📊 Checking task status:', taskId);

      // Import supabase client for direct DB access
      const { supabase } = await import('./supabase');
      
      // Query both tables for compatibility
      let query = supabase.from('face_swap_tasks').select('*');
      
      // Try provider task_id first
      const { data: legacyTask, error: legacyError } = await query.eq('task_id', taskId).single();
      
      if (legacyTask) {
        console.log('📈 Found legacy task:', legacyTask);
        // Convert legacy format to new format
        const task: Task = {
          id: legacyTask.id || taskId,
          task_id: legacyTask.task_id,
          status: legacyTask.status === 'completed' ? 'succeeded' : legacyTask.status || 'processing',
          source_image: legacyTask.source_image,
          face_image: legacyTask.face_image,
          result_image: legacyTask.result_image,
          provider: 'aifaceswap',
          credits_used: legacyTask.credits_used || 2,
          error: legacyTask.error_message,
          created_at: legacyTask.created_at,
          updated_at: legacyTask.updated_at || legacyTask.created_at
        };
        
        return { ok: true, task };
      }
      
      console.log('📈 Task not found in legacy table');
      return {
        ok: false,
        error: 'Task not found'
      };
      
    } catch (error) {
      console.error('💥 Task status check error:', error);
      return {
        ok: false,
        error: `Task status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Poll for task completion with improved timeout handling
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
    const interval = options.intervalMs ?? 5000;
    const max = options.maxPolls ?? 180; // 15 minutes with 5s intervals
    
    console.log(`🔄 Starting enhanced polling for task: ${taskId}`);
    console.log(`📊 Polling config: ${interval}ms intervals, max ${max} polls (${(max * interval) / 1000}s total)`);

    for (let i = 0; i < max; i++) {
      try {
        const response = await this.getTaskStatus(taskId);
        
        if (!response.ok || !response.task) {
          console.warn(`⚠️ Poll ${i + 1}: Task status check failed:`, response.error);
          continue;
        }

        const task = response.task;
        console.log(`📡 Poll ${i + 1}: Task status = ${task.status}`, {
          hasResult: !!task.result_image,
          error: task.error
        });

        // Notify caller of updates
        if (options.onUpdate) {
          options.onUpdate(task);
        }

        // Check for completion states
        if (['succeeded', 'failed', 'timeout', 'cancelled'].includes(task.status)) {
          console.log(`✅ Task completed with status: ${task.status}`);
          return task;
        }

        // After 3 minutes (36 polls), mark as timeout
        if (i >= 36 && task.status === 'processing') {
          console.log('⚠️ Webhook timeout detected, marking task as timeout...');
          
          try {
            // Import supabase for direct update
            const { supabase } = await import('./supabase');
            
            const { error: updateError } = await supabase
              .from('face_swap_tasks')
              .update({
                status: 'failed',
                error_message: 'Processing timeout - webhook not received within 3 minutes',
                updated_at: new Date().toISOString()
              })
              .eq('task_id', taskId);
            
            if (updateError) {
              console.error('❌ Failed to update task as timeout:', updateError);
            } else {
              console.log('✅ Task marked as timeout');
              // Continue polling to get updated task
            }
          } catch (timeoutError) {
            console.error('❌ Error marking task as timeout:', timeoutError);
          }
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, interval));
        
      } catch (error) {
        console.error(`💥 Poll ${i + 1} exception:`, error);
        // Continue polling despite errors
      }
    }

    console.log('⏰ Polling timeout reached');
    if (options.onTimeout) {
      options.onTimeout();
    }
    
    return null; // Timeout
  }

  /**
   * Upload image to Supabase storage and get public URL
   */
  async uploadImage(file: File): Promise<string> {
    // Implementation will use existing uploadImageToSupabase function
    const { uploadImageToSupabase } = await import('./supabase');
    return await uploadImageToSupabase(file);
  }
}

export const faceSwapAPIService = new FaceSwapAPIService();