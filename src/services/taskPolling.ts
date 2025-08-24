import { supabase } from './supabase';
import { aiFaceSwapService } from './aifaceswap';

export interface FaceSwapTask {
  id: string;
  task_id: string;
  status: 'processing' | 'succeeded' | 'failed';
  source_image: string;
  face_image: string;
  result_image?: string;
  credits_used: number;
  error?: string;
  created_at: string;
  updated_at: string;
}

export class TaskPollingService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private pollCount: Map<string, number> = new Map();

  /**
   * Start polling for task completion with API status check fallback
   */
  async startPolling(
    taskId: string,
    onUpdate: (task: FaceSwapTask) => void,
    onComplete: (task: FaceSwapTask) => void,
    onError: (error: string) => void
  ): Promise<void> {
    console.log('🔄 Starting enhanced polling for task:', taskId);

    this.stopPolling(taskId);
    this.pollCount.set(taskId, 0);

    const intervalId = setInterval(async () => {
      try {
        const currentCount = this.pollCount.get(taskId) || 0;
        this.pollCount.set(taskId, currentCount + 1);
        
        console.log(`📡 Polling task status (${currentCount + 1}):`, taskId);
        
        // Query unified tasks table
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('task_id', taskId)
          .single();

        if (error) {
          console.error('❌ Database polling error:', error);
          onError(`Database error: ${error.message}`);
          this.stopPolling(taskId);
          return;
        }

        if (!data) {
          console.warn('⚠️ Task not found:', taskId);
          onError('Task not found in database');
          this.stopPolling(taskId);
          return;
        }

        console.log('📊 DB Task status:', data.status, data);
        onUpdate(data);

        if (data.status === 'succeeded' && data.result_image) {
          console.log('✅ Task completed successfully from database');
          onComplete(data);
          this.stopPolling(taskId);
          return;
        } else if (data.status === 'failed') {
          console.log('❌ Task failed from database:', data.error);
          onError(data.error || 'Task processing failed');
          this.stopPolling(taskId);
          return;
        }

        // If still processing after some time, check API directly
        if (currentCount >= 6 && data.status === 'processing') {
          try {
            console.log('🔍 Checking AIFaceSwap API directly for task:', taskId);
            const apiResponse = await aiFaceSwapService.checkTaskStatus(taskId);
            console.log('📋 API response:', apiResponse);
            
            if (apiResponse.code === 200 && apiResponse.data) {
              const apiData = apiResponse.data;
              
              if (apiData.status === 'completed' && apiData.result_image) {
                console.log('✅ Task completed per API, updating database...');
                const { error: updateError } = await supabase
                  .from('tasks')
                  .update({
                    status: 'succeeded',
                    result_image: apiData.result_image,
                    updated_at: new Date().toISOString()
                  })
                  .eq('task_id', taskId);
                if (updateError) {
                  console.error('❌ Failed to update task:', updateError);
                }
              } else if (apiData.status === 'failed') {
                console.log('❌ Task failed per API, updating database...');
                const { error: updateError } = await supabase
                  .from('tasks')
                  .update({
                    status: 'failed',
                    error: apiData.message || 'Processing failed',
                    updated_at: new Date().toISOString()
                  })
                  .eq('task_id', taskId);
                if (updateError) {
                  console.error('❌ Failed to update failed task:', updateError);
                }
              }
            }
          } catch (apiError) {
            console.error('❌ Error checking API status:', apiError);
          }
        }

        if (currentCount % 6 === 0) {
          console.log('📊 Extended polling...', {
            taskId,
            pollCount: currentCount,
            timeElapsed: `${currentCount * 5}s`
          });
        }

      } catch (error) {
        console.error('💥 Polling exception:', error);
        onError(`Polling error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        this.stopPolling(taskId);
      }
    }, 5000);

    this.pollingIntervals.set(taskId, intervalId);

    setTimeout(() => {
      if (this.pollingIntervals.has(taskId)) {
        console.log('⏰ Polling timeout for task:', taskId);
        onError('Task processing timeout (15 minutes exceeded) - Webhook may have failed');
        this.stopPolling(taskId);
      }
    }, 15 * 60 * 1000);
  }

  stopPolling(taskId: string): void {
    const intervalId = this.pollingIntervals.get(taskId);
    if (intervalId) {
      console.log('🛑 Stopping polling for task:', taskId);
      clearInterval(intervalId);
      this.pollingIntervals.delete(taskId);
      this.pollCount.delete(taskId);
    }
  }

  stopAllPolling(): void {
    console.log('🛑 Stopping all polling');
    this.pollingIntervals.forEach((intervalId, taskId) => {
      clearInterval(intervalId);
      console.log('Stopped polling for task:', taskId);
    });
    this.pollingIntervals.clear();
    this.pollCount.clear();
  }

  async getTaskStatus(taskId: string): Promise<FaceSwapTask | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('task_id', taskId)
        .single();

      if (error) {
        console.error('Error fetching task status:', error);
        return null;
      }

      return data as FaceSwapTask;
    } catch (error) {
      console.error('Exception fetching task status:', error);
      return null;
    }
  }

  async getAllTasks(): Promise<FaceSwapTask[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching all tasks:', error);
        return [];
      }

      return (data || []) as FaceSwapTask[];
    } catch (error) {
      console.error('Exception fetching all tasks:', error);
      return [];
    }
  }
}

export const taskPollingService = new TaskPollingService();