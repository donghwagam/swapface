/**
 * 애플리케이션 전체에서 사용되는 타입 정의
 */

export interface User {
  id: string;
  name: string;
  credits: number;
  freeTrialsUsed: number;
  maxFreeTrials: number;
}

export interface SwapHistory {
  id: string;
  originalImage: string;
  swappedImage: string;
  timestamp: Date;
  creditsUsed: number;
}

export interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  originalPrice?: number;
  isPopular?: boolean;
  badge?: string;
}

export interface UploadStep {
  step: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}

export interface SwapResult {
  originalImage: string;
  swappedImage: string;
  processingTime: number;
  creditsUsed: number;
  swapType: 'single' | 'multi' | 'video';
}

export interface VideoSwapResult {
  originalVideo: string;
  swappedVideo: string;
  processingTime: number;
  creditsUsed: number;
  duration: number;
}

export interface MultiFaceSwapResult {
  originalImage: string;
  swappedImage: string;
  processingTime: number;
  creditsUsed: number;
  facesDetected: number;
  facesSwapped: number;
}

export type SwapMode = 'single' | 'multi' | 'video';

export interface SwapModeOption {
  id: SwapMode;
  title: string;
  description: string;
  icon: string;
  creditCost: number;
  features: string[];
  isPopular?: boolean;
}