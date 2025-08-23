/**
 * AIFaceSwap.io API service for face swap functionality
 * API Documentation: https://aifaceswap.io/api-doc/
 */

import { callAIFaceSwapAPI, uploadImageToSupabase, supabase } from './supabase';

export interface FaceSwapRequest {
  source_image: string;
  face_image: string;
  webhook?: string;
}

export interface MultiFaceSwapRequest {
  source_image: string;
  face_image: string[];
  index: number[];
  webhook?: string;
}

export interface VideoFaceSwapRequest {
  source_video: string;
  face_image: string;
  duration: number;
  enhance: 0 | 1 | 2; // 0: No enhance, 1: <=1080p, 2: <=2k
  webhook?: string;
}

export interface ExtractFaceRequest {
  img: string;
}

export interface FaceSwapResponse {
  code: number;
  data: {
    points: number;
    task_id: string;
  };
  extra_data?: any;
  message: string;
}

export interface ExtractFaceResponse {
  code: number;
  data: {
    faces: number[][]; // Array of [x1, y1, x2, y2] coordinates
    points: number;
  };
  message: string;
}

export interface WebhookData {
  success: number; // 1 for success, 0 for failure
  type: number; // 1 for single person, 2 for multiple person
  task_id: string;
  result_image: string;
}

class AIFaceSwapService {
  private readonly useMockData = false; // Real API integration restored

  constructor() {
    // API key is now handled by Supabase Edge Function
  }

  private async makeRequest<T>(
    action: string,
    body: any
  ): Promise<T> {
    try {
      const result = await callAIFaceSwapAPI(action, body);
      
      if (result.code !== 200) {
        throw new Error(`AIFaceSwap API error: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('AIFaceSwap request failed:', error);
      throw error;
    }
  }

  /**
   * Single face swap
   */
  async faceSwap(request: FaceSwapRequest): Promise<FaceSwapResponse> {
    if (this.useMockData) {
      // Mock response for demo
      console.log('Mock face swap request:', request);
      return {
        code: 200,
        data: {
          points: 2,
          task_id: `mock_${Date.now()}`
        },
        message: 'OK'
      };
    }
    
    return this.makeRequest<FaceSwapResponse>('faceswap', request);
  }

  /**
   * Extract faces from image (for multiple face swap)
   */
  async extractFaces(request: ExtractFaceRequest): Promise<ExtractFaceResponse> {
    return this.makeRequest<ExtractFaceResponse>('extract_face', request);
  }

  /**
   * Extract faces from image file using aifaceswap-proxy
   */
  async extractFacesFromFile(file: File): Promise<ExtractFaceResponse> {
    try {
      console.log('🔄 Uploading file for face detection:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // First upload image to get public URL
      const imageUrl = await this.uploadImage(file);
      console.log('📤 Image uploaded for face detection:', imageUrl);
      
      // Use aifaceswap-proxy to call extract_face API
      const response = await callAIFaceSwapAPI('extract_face', { img: imageUrl });
      
      if (response.code !== 200) {
        throw new Error(`Face detection failed: ${response.message}`);
      }
      
      console.log('✅ Face detection successful:', {
        facesFound: response?.data?.faces?.length || 0,
        response: response
      });
      
      return response;
      
    } catch (error) {
      console.error('❌ Extract faces from file failed:', error);
      throw error;
    }
  }

  /**
   * Multiple face swap
   */
  async multiFaceSwap(request: MultiFaceSwapRequest): Promise<FaceSwapResponse> {
    return this.makeRequest<FaceSwapResponse>('multi_faceswap', request);
  }

  /**
   * Check task status directly with AIFaceSwap API using query action
   */
  async getTaskStatus(taskId: string): Promise<any> {
    try {
      const response = await callAIFaceSwapAPI('query', { task_id: taskId });
      return response;
    } catch (error) {
      console.error('❌ Task status check failed:', error);
      throw error;
    }
  }

  /**
   * Poll task status with direct AIFaceSwap API calls
   */
  async pollTaskDirect(taskId: string, options: {
    intervalMs?: number;
    maxPolls?: number;
    onUpdate?: (task: any) => void;
  } = {}): Promise<any> {
    const interval = options.intervalMs || 5000;
    const maxPolls = options.maxPolls || 180;
    
    console.log(`🔄 Starting direct AIFaceSwap polling for task: ${taskId}`);
    console.log(`📊 Polling config: ${interval}ms intervals, max ${maxPolls} polls`);

    for (let i = 0; i < maxPolls; i++) {
      try {
        console.log(`📊 Direct poll ${i + 1}: Checking task status: ${taskId}`);
        
        const task = await this.getTaskStatus(taskId);
        
        if (task && task.code === 200) {
          const status = task.data?.status || 'unknown';
          console.log(`📈 Task status: ${status}`, task.data);
          
          if (options.onUpdate) {
            options.onUpdate({ ...task.data, status });
          }
          
          if (status === 'completed' || status === 'succeeded') {
            console.log('🎉 Task completed successfully');
            return task.data;
          }
          
          if (status === 'failed' || status === 'error') {
            console.log('❌ Task failed');
            throw new Error(`Task failed: ${task.data?.error || 'Unknown error'}`);
          }
        } else {
          console.log(`⚠️ Poll ${i + 1}: Invalid response`, task);
        }

        // Wait before next poll
        if (i < maxPolls - 1) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
        
      } catch (error) {
        console.error(`💥 Poll ${i + 1} exception:`, error);
        // Continue polling despite errors for first few attempts
        if (i < 3) {
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        throw error;
      }
    }

    console.log('⏰ Direct polling timeout reached');
    throw new Error('Task polling timeout');
  }

  /**
   * Basic video face swap
   */
  async videoFaceSwap(request: VideoFaceSwapRequest): Promise<FaceSwapResponse> {
    return this.makeRequest<FaceSwapResponse>('video_faceswap', request);
  }

  /**
   * Check task status directly from AIFaceSwap.io API
   */
  async checkTaskStatus(taskId: string): Promise<any> {
    // 🔧 FIX: Unified to use query action internally
    return this.getTaskStatus(taskId);
  }

  /**
   * Upload image file to Supabase Storage and get public URL
   */
  async uploadImage(file: File): Promise<string> {
    console.log('🔄 Uploading image to Supabase Storage:', file.name);
    
    try {
      const publicUrl = await uploadImageToSupabase(file);
      console.log('✅ Image uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      throw new Error(`Image upload failed: ${error}`);
    }
  }

  /**
   * Convert file to blob URL for temporary use
   */
  createImageUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Check if service is configured (always true with Supabase proxy)
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Get pricing information
   */
  getPricing() {
    return {
      faceSwap: 2, // credits
      extractFaces: 2, // credits
      multiFaceSwap: 5, // credits
      videoFaceSwap: {
        noEnhance: 2, // credits per second
        enhance1080p: 4, // credits per second
        enhance2k: 6, // credits per second
      },
    };
  }

  /**
   * Calculate video face swap cost
   */
  calculateVideoSwapCost(duration: number, enhance: 0 | 1 | 2): number {
    const pricing = this.getPricing().videoFaceSwap;
    switch (enhance) {
      case 0: return duration * pricing.noEnhance;
      case 1: return duration * pricing.enhance1080p;
      case 2: return duration * pricing.enhance2k;
      default: return duration * pricing.noEnhance;
    }
  }
}

export const aiFaceSwapService = new AIFaceSwapService();