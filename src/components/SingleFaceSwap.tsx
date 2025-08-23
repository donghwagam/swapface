import React from 'react';
import { Upload, Image as ImageIcon, Wand2, Download, RefreshCw, ArrowLeft, AlertCircle, User } from 'lucide-react';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { ApiKeySetup } from './ApiKeySetup';
import { aiFaceSwapService } from '../services/aifaceswap';
import { faceSwapAPIService } from '../services/faceSwapAPI';
import type { User as UserType, SwapResult } from '../types';

interface SingleFaceSwapProps {
  user: UserType;
  onBack: () => void;
  onSwapComplete: (result: SwapResult) => void;
  onCreditDeduct: () => boolean;
}

type FlowStep = 'upload' | 'preview' | 'processing' | 'result';

/**
 * 단일 얼굴 바꾸기 컴포넌트
 */
export const SingleFaceSwap: React.FC<SingleFaceSwapProps> = ({
  user,
  onBack,
  onSwapComplete,
  onCreditDeduct,
}) => {
  const [currentStep, setCurrentStep] = React.useState<FlowStep>('upload');
  const [originalImage, setOriginalImage] = React.useState<string>('');
  const [faceImage, setFaceImage] = React.useState<string>('');
  const [originalFile, setOriginalFile] = React.useState<File | null>(null);
  const [faceFile, setFaceFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState<string>('');
  const [processingProgress, setProcessingProgress] = React.useState<number>(0);
  const [result, setResult] = React.useState<SwapResult | null>(null);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [currentTaskId, setCurrentTaskId] = React.useState<string>('');
  const [taskStatus, setTaskStatus] = React.useState<string>('');
  const originalInputRef = React.useRef<HTMLInputElement>(null);
  const faceInputRef = React.useRef<HTMLInputElement>(null);

  const creditCost = 2; // AIFaceSwap.io API 기준
  const canAffordSwap = user.freeTrialsUsed < user.maxFreeTrials || user.credits >= creditCost;

  const handleDragOver = (e: React.DragEvent, type: string): void => {
    e.preventDefault();
    setDragOver(type);
  };

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragOver('');
  };

  const handleDrop = (e: React.DragEvent, type: 'original' | 'face'): void => {
    e.preventDefault();
    setDragOver('');
    handleFiles(e.dataTransfer.files, type);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'original' | 'face'): void => {
    if (e.target.files) {
      handleFiles(e.target.files, type);
    }
  };

  const handleFiles = (files: FileList, type: 'original' | 'face'): void => {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      if (type === 'original') {
        setOriginalImage(imageUrl);
        setOriginalFile(file);
      } else {
        setFaceImage(imageUrl);
        setFaceFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSwap = async (): Promise<void> => {
    if (!canAffordSwap) {
      alert('크레딧이 부족합니다. 크레딧을 충전해 주세요.');
      return;
    }

    if (!originalFile || !faceFile) {
      alert('원본 이미지와 얼굴 이미지를 모두 업로드해 주세요.');
      return;
    }

    if (!aiFaceSwapService.isConfigured()) {
      alert('AIFaceSwap API 키가 설정되지 않았습니다.');
      return;
    }

    // Skip task checking for cleaner startup

    if (!onCreditDeduct()) {
      alert('크레딧 차감에 실패했습니다.');
      return;
    }

    setCurrentStep('processing');
    setProcessingProgress(10);
    setIsProcessing(true);
    setErrorMessage('');
    setTaskStatus('이미지 업로드 중...');

    const startTime = Date.now();

    try {
      // Upload images to get public URLs
      setTaskStatus('이미지를 업로드하는 중...');
      const sourceImageUrl = await faceSwapAPIService.uploadImage(originalFile);
      const faceImageUrl = await faceSwapAPIService.uploadImage(faceFile);

      setProcessingProgress(20);
      setTaskStatus('웹훅 기반 Face Swap API 호출 중...');

      // Start face swap with webhook-based API as recommended
      const response = await faceSwapAPIService.startFaceSwap(sourceImageUrl, faceImageUrl);

      console.log('✅ Face swap initiated:', response);

      if (!response.task_id) {
        throw new Error('API 응답에서 task_id를 받지 못했습니다.');
      }

      const taskId = response.task_id;
      setCurrentTaskId(taskId);
      setProcessingProgress(30);
      setTaskStatus(`AI가 얼굴을 바꾸는 중... (Task ID: ${taskId})`);

      // Start webhook-based polling (database queries)
      const result = await faceSwapAPIService.pollTask(taskId, {
        intervalMs: 3000, // 3 second intervals for faster response
        maxPolls: 120, // 6 minutes total
        onUpdate: (task) => {
          console.log('📊 Task update:', task.status);
          setTaskStatus(`처리 중... 상태: ${task.status} (웹훅 대기)`);
          
          // Update progress based on time elapsed
          const elapsed = Date.now() - startTime;
          let estimatedProgress = 30 + (elapsed / 1000) * 2;
          
          if (task.status === 'processing') {
            estimatedProgress = Math.min(estimatedProgress + 20, 95);
          }
          
          estimatedProgress = Math.min(estimatedProgress, 95);
          setProcessingProgress(estimatedProgress);
        },
        onTimeout: () => {
          console.log('⏰ Webhook polling timeout');
          setErrorMessage('웹훅 처리 시간이 초과되었습니다.');
          setTaskStatus('웹훅 시간 초과');
          setIsProcessing(false);
          alert('웹훅 처리 시간이 초과되었습니다. 다시 시도해주세요.');
          setCurrentStep('preview');
        }
      });

      if (result && (result.status === 'completed' || result.status === 'succeeded') && result.result_image) {
        console.log('🎉 Task completed:', result);
        setProcessingProgress(100);
        setTaskStatus('완료!');

        const processingTime = (Date.now() - startTime) / 1000;
        
        const swapResult: SwapResult = {
          originalImage,
          swappedImage: result.result_image,
          processingTime,
          creditsUsed: result.credits_used || 2,
          swapType: 'single',
        };

        setResult(swapResult);
        setCurrentStep('result');
        onSwapComplete(swapResult);
        setIsProcessing(false);
      } else {
        throw new Error('작업이 완료되지 않았거나 결과를 받지 못했습니다.');
      }

    } catch (error) {
      console.error('Face swap error:', error);
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setErrorMessage(errorMsg);
      setTaskStatus(`오류: ${errorMsg}`);
      alert(`오류: ${errorMsg}`);
      setCurrentStep('preview');
      setIsProcessing(false);
    }
  };

  const handleRetry = (): void => {
    setOriginalImage('');
    setFaceImage('');
    setOriginalFile(null);
    setFaceFile(null);
    setResult(null);
    setProcessingProgress(0);
    setErrorMessage('');
    setIsProcessing(false);
    setCurrentTaskId('');
    setTaskStatus('');
    setCurrentStep('upload');
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Cleanup is handled automatically by the stable polling service
    };
  }, [currentTaskId]);

  const canProceed = originalImage && faceImage;

  React.useEffect(() => {
    if (canProceed && currentStep === 'upload') {
      setCurrentStep('preview');
    }
  }, [canProceed, currentStep]);

  const renderUploadStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <User className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">단일 얼굴 바꾸기</h2>
        <p className="text-gray-600 text-lg mb-2">원본 이미지와 바꿀 얼굴 이미지를 업로드하세요</p>
        <p className="text-sm text-blue-600 font-medium">💡 정면을 바라보는 선명한 사진일수록 결과가 좋아요!</p>
      </div>

      {!aiFaceSwapService.isConfigured() && <ApiKeySetup apiProvider="aifaceswap" />}

      <div className="grid md:grid-cols-2 gap-8">
        {/* 원본 이미지 업로드 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">원본 이미지</h3>
          <div
            className={`border-2 border-dashed rounded-2xl p-8 transition-all duration-200 ${
              dragOver === 'original'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onDragOver={(e) => handleDragOver(e, 'original')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'original')}
          >
            {originalImage ? (
              <div className="relative">
                <img src={originalImage} alt="원본 이미지" className="w-full h-48 object-cover rounded-xl" />
                <button
                  onClick={() => setOriginalImage('')}
                  className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">얼굴이 바뀔 원본 이미지</p>
                <button
                  onClick={() => originalInputRef.current?.click()}
                  className="bg-blue-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-600 transition-colors"
                >
                  이미지 선택
                </button>
              </>
            )}
          </div>
          <input
            ref={originalInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, 'original')}
            className="hidden"
          />
        </div>

        {/* 얼굴 이미지 업로드 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">얼굴 이미지</h3>
          <div
            className={`border-2 border-dashed rounded-2xl p-8 transition-all duration-200 ${
              dragOver === 'face'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
            }`}
            onDragOver={(e) => handleDragOver(e, 'face')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'face')}
          >
            {faceImage ? (
              <div className="relative">
                <img src={faceImage} alt="얼굴 이미지" className="w-full h-48 object-cover rounded-xl" />
                <button
                  onClick={() => setFaceImage('')}
                  className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">바꿀 얼굴 이미지</p>
                <button
                  onClick={() => faceInputRef.current?.click()}
                  className="bg-green-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-green-600 transition-colors"
                >
                  이미지 선택
                </button>
              </>
            )}
          </div>
          <input
            ref={faceInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, 'face')}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <ImageIcon className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">미리보기</h2>
        <p className="text-gray-600 text-lg">선택한 이미지를 확인하고 얼굴 바꾸기를 시작하세요</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="relative">
          <img src={originalImage} alt="원본 이미지" className="w-full h-64 object-cover rounded-xl shadow-lg" />
          <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
            원본 이미지
          </div>
        </div>
        <div className="relative">
          <img src={faceImage} alt="얼굴 이미지" className="w-full h-64 object-cover rounded-xl shadow-lg" />
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            얼굴 이미지
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {!canAffordSwap && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">크레딧이 부족합니다. 크레딧을 충전한 후 이용해 주세요.</p>
          </div>
        )}
        
        <button
          onClick={handleSwap}
          disabled={!canAffordSwap || isProcessing}
          className={`w-full py-4 px-8 rounded-full text-lg font-semibold transition-all duration-200 ${
            canAffordSwap && !isProcessing
              ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white hover:shadow-xl hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            <Wand2 className="w-6 h-6" />
            <span>얼굴 바꾸기 시작 ({creditCost} 크레딧)</span>
          </div>
        </button>

        <button
          onClick={() => setCurrentStep('upload')}
          className="text-gray-600 hover:text-gray-800 font-medium"
        >
          다른 이미지 선택하기
        </button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Wand2 className="w-12 h-12 text-white animate-spin" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">AI가 얼굴을 바꾸는 중...</h2>
        <p className="text-gray-600 text-lg">잠시만 기다려 주세요. 곧 완성됩니다!</p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${processingProgress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mb-8">{Math.round(processingProgress)}% 완료</p>
      </div>

      <div className="space-y-4">
        {/* Real-time Task Status */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-blue-800 font-medium">
              {taskStatus || 'AI가 얼굴을 바꾸는 중...'}
            </span>
          </div>
          {currentTaskId && (
            <div className="text-xs text-blue-600 text-center mt-2">
              Task ID: {currentTaskId}
            </div>
          )}
        </div>

        {/* Traditional Progress Steps */}
        <div className="space-y-3 text-sm text-gray-500">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <span>실시간 웹훅 시스템으로 처리 중...</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-150"></div>
            <span>AIFaceSwap.io 고품질 처리...</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-300"></div>
            <span>결과를 데이터베이스에서 확인 중...</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{errorMessage}</span>
        </div>
      )}
    </div>
  );

  const renderResultStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Download className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">완성! 🎉</h2>
        <p className="text-gray-600 text-lg">AI가 생성한 결과를 확인해 보세요</p>
      </div>

      {result && (
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="relative">
              <div className="max-w-md mx-auto">
                <img 
                  src={result.swappedImage} 
                  alt="AI 얼굴 바꾸기 결과" 
                  className="w-full h-auto rounded-xl shadow-lg border border-gray-200"
                  style={{ maxHeight: '500px', objectFit: 'contain' }}
                />
                <div className="absolute top-4 left-4 bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                  ✨ AI 생성 완료
                </div>
              </div>
            </div>
            
            {/* Before/After comparison */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">변환 비교</h3>
              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-2">원본</p>
                  <img 
                    src={result.originalImage} 
                    alt="원본 이미지" 
                    className="w-full h-24 object-cover rounded-lg shadow border border-gray-200"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-2">결과</p>
                  <img 
                    src={result.swappedImage} 
                    alt="변환된 이미지" 
                    className="w-full h-24 object-cover rounded-lg shadow border border-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <p className="text-blue-800 font-medium">
              {result.creditsUsed} 크레딧이 차감되었습니다. (보유: {user.credits})
            </p>
            <p className="text-blue-600 text-sm mt-1">
              처리 시간: {result.processingTime}초
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleRetry}
              className="flex items-center justify-center space-x-2 bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
            >
              <RefreshCw className="w-5 h-5" />
              <span>다시 시도</span>
            </button>

            <button 
              onClick={() => {
                if (result?.swappedImage) {
                  const link = document.createElement('a');
                  link.href = result.swappedImage;
                  link.download = `faceswap-result-${Date.now()}.jpg`;
                  link.click();
                }
              }}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-200 hover:scale-105 hover:from-green-600 hover:to-blue-600"
            >
              <Download className="w-5 h-5" />
              <span>이미지 다운로드</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-8 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>뒤로가기</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'preview' && renderPreviewStep()}
          {currentStep === 'processing' && renderProcessingStep()}
          {currentStep === 'result' && renderResultStep()}
        </div>
      </div>
    </div>
  );
};