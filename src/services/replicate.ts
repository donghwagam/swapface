/**
 * Replicate API service for face swap functionality
 * Uses CORS proxy to bypass browser limitations
 */

export interface FaceSwapRequest {
  target_image: string;
  swap_image: string;
  swap_image_b?: string;
  user_gender?: 'a man' | 'a woman';
  user_b_gender?: 'a man' | 'a woman';
  hair_source?: 'user' | 'target';
  upscale?: boolean;
  detailer?: boolean;
}

export interface FaceSwapResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string;
  error?: string;
  logs?: string;
}

export interface PredictionResponse {
  id: string;
  status: string;
  output: string | null;
  error: string | null;
  logs: string | null;
  started_at: string | null;
  completed_at: string | null;
}

class ReplicateService {
  private readonly baseUrl = 'https://api.replicate.com/v1';
  private readonly useMockData = true; // 데모용 Mock 데이터 사용
  private readonly modelVersion = 'easel/advanced-face-swap';
  private readonly apiToken: string;

  constructor() {
    this.apiToken = import.meta.env.VITE_REPLICATE_API_TOKEN || '';
    if (!this.apiToken) {
      console.warn('Replicate API token not found. Please set VITE_REPLICATE_API_TOKEN environment variable.');
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Replicate API error: ${response.status} ${response.statusText}. ${
          errorData.detail || errorData.message || ''
        }`
      );
    }

    return response.json();
  }

  /**
   * Start a face swap prediction
   */
  async createFaceSwap(input: FaceSwapRequest): Promise<FaceSwapResponse> {
    if (this.useMockData) {
      // Mock response for demo
      return {
        id: `pred_${Date.now()}`,
        status: 'processing',
        output: undefined,
        error: undefined,
        logs: undefined,
      };
    }

    const endpoint = '/predictions';
    
    const payload = {
      version: this.modelVersion,
      input: {
        target_image: input.target_image,
        swap_image: input.swap_image,
        ...(input.swap_image_b && { swap_image_b: input.swap_image_b }),
        ...(input.user_gender && { user_gender: input.user_gender }),
        ...(input.user_b_gender && { user_b_gender: input.user_b_gender }),
        hair_source: input.hair_source || 'target',
        upscale: input.upscale !== false, // default true
        detailer: input.detailer || false,
      },
    };

    const response = await this.makeRequest<PredictionResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: response.id,
      status: response.status as FaceSwapResponse['status'],
      output: response.output || undefined,
      error: response.error || undefined,
      logs: response.logs || undefined,
    };
  }

  /**
   * Get the status of a prediction
   */
  async getPrediction(predictionId: string): Promise<FaceSwapResponse> {
    if (this.useMockData) {
      // Mock response for demo - simulate completion after some time
      const isComplete = Date.now() - parseInt(predictionId.replace('pred_', '')) > 5000;
      
      return {
        id: predictionId,
        status: isComplete ? 'succeeded' : 'processing',
        output: isComplete ? 'https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=400' : undefined,
        error: undefined,
        logs: undefined,
      };
    }

    const endpoint = `/predictions/${predictionId}`;
    
    const response = await this.makeRequest<PredictionResponse>(endpoint);

    return {
      id: response.id,
      status: response.status as FaceSwapResponse['status'],
      output: response.output || undefined,
      error: response.error || undefined,
      logs: response.logs || undefined,
    };
  }

  /**
   * Poll for prediction completion
   */
  async waitForCompletion(
    predictionId: string,
    maxWaitTime: number = 300000, // 5 minutes
    pollInterval: number = 2000 // 2 seconds
  ): Promise<FaceSwapResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const prediction = await this.getPrediction(predictionId);
      
      if (prediction.status === 'succeeded' || prediction.status === 'failed') {
        return prediction;
      }
      
      if (prediction.status === 'canceled') {
        throw new Error('Prediction was canceled');
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('Prediction timed out');
  }

  /**
   * Upload image to a temporary URL (for development)
   * In production, you'd want to use your own image hosting
   */
  async uploadImage(file: File): Promise<string> {
    // For now, we'll convert to base64 data URL
    // In production, you should upload to your own server or cloud storage
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert file to blob URL for temporary use
   */
  createImageUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Check if API token is configured
   */
  isConfigured(): boolean {
    return !!this.apiToken;
  }
}

export const replicateService = new ReplicateService();