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
   * Extract faces from image file directly using Supabase SDK
   */
  async extractFacesFromFile(file: File): Promise<ExtractFaceResponse> {
    try {
      console.log('🔄 Uploading file for face detection:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Use Supabase SDK to call Edge Function with file upload
      const formData = new FormData();
      formData.append('img', file);
      
      const { data, error } = await supabase.functions.invoke('faceswap-start/extract_face', {
        body: formData
      });
      
      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`Extract faces failed: ${error.message}`);
      }
      
      if (!data || (data.code && data.code !== 200)) {
        console.error('❌ Extract faces API error:', data);
        throw new Error(`Extract faces failed: ${data?.message || 'unknown error'}`);
      }
      
      console.log('✅ Face detection successful:', {
        facesFound: data?.data?.faces?.length || 0,
        response: data
      });
      
      return data;
      
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
   * Basic video face swap
   */
  async videoFaceSwap(request: VideoFaceSwapRequest): Promise<FaceSwapResponse> {
    return this.makeRequest<FaceSwapResponse>('video_faceswap', request);
  }

  /**
   * Check task status directly from AIFaceSwap.io API
   */
  async checkTaskStatus(taskId: string): Promise<any> {
    return this.makeRequest<any>('check_status', { task_id: taskId });
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