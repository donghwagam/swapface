import React from 'react';
import { Upload, Image as ImageIcon, Wand2, Download, RefreshCw, ArrowLeft, AlertCircle, User } from 'lucide-react';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { faceSwapAPIService, type Task } from '../services/faceSwapAPI';
import { uploadImageToSupabase } from '../services/supabase';
import type { User as UserType, SwapResult } from '../types';

interface SingleFaceSwapImprovedProps {
  user: UserType;
  onBack: () => void;
  onSwapComplete: (result: SwapResult) => void;
  onCreditDeduct: () => boolean;
}

type FlowStep = 'upload' | 'preview' | 'processing' | 'result';

/**
 * Improved single face swap component using server-side API
 */
export const SingleFaceSwapImproved: React.FC<SingleFaceSwapImprovedProps> = ({
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
  const [currentTask, setCurrentTask] = React.useState<Task | null>(null);
  const originalInputRef = React.useRef<HTMLInputElement>(null);
  const faceInputRef = React.useRef<HTMLInputElement>(null);

  const creditCost = 2; // AIFaceSwap.io API cost
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
  const canAffordSwap = isDevelopment || user.freeTrialsUsed < user.maxFreeTrials || user.credits >= creditCost;

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

    // 개발환경에서는 크레딧 차감 시뮬레이션
    if (isDevelopment) {
      console.log('🛠️ Development mode: Simulating credit deduction');
    } else if (!onCreditDeduct()) {
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
      const sourceImageUrl = await uploadImageToSupabase(originalFile);
      const faceImageUrl = await uploadImageToSupabase(faceFile);

      setProcessingProgress(20);
      setTaskStatus('서버에 작업 요청 중...');

      // Start face swap using improved server-side API
      const response = await faceSwapAPIService.startFaceSwap(sourceImageUrl, faceImageUrl);

      console.log('✅ Face swap initiated via server:', response);

      if (!response.ok || !response.id) {
        throw new Error(response.error || '서버에서 작업 시작에 실패했습니다.');
      }

      const taskId = response.id;
      const providerTaskId = response.task_id;
      setCurrentTaskId(taskId);
      setProcessingProgress(30);
      setTaskStatus(`AI가 얼굴을 바꾸는 중... (Task ID: ${providerTaskId || taskId})`);

      // Start enhanced polling using new API service
      const result = await faceSwapAPIService.pollTask(taskId, {
        intervalMs: 5000,
        maxPolls: 180, // 15 minutes
        
        // onUpdate - called every poll
        onUpdate: (task: Task) => {
          console.log('📊 Task update:', task.status, {
            hasResult: !!task.result_image,
            error: task.error
          });
          setCurrentTask(task);
          setTaskStatus(`처리 중... 상태: ${task.status}`);
          
          // Update progress based on status and time
          const elapsed = (Date.now() - startTime) / 1000;
          let progress = 30;
          
          if (task.status === 'processing') {
            progress = Math.min(90, 30 + elapsed * 2); // Gradual progress
          }
          
          setProcessingProgress(progress);
        },
        
        // onTimeout
        onTimeout: () => {
          console.warn('⏰ Task polling timed out');
          setTaskStatus('처리 시간이 너무 오래 걸립니다. 다시 시도해 주세요.');
          setErrorMessage('작업이 시간 초과되었습니다. AIFaceSwap.io 서버가 응답하지 않습니다.');
          setIsProcessing(false);
        }
      });

      if (!result) {
        throw new Error('작업이 시간 초과되었습니다.');
      }

      if (result.status === 'succeeded' && result.result_image) {
        // Success - create result
        const endTime = Date.now();
        const swapResult: SwapResult = {
          originalImage,
          swappedImage: result.result_image,
          processingTime: Math.round((endTime - startTime) / 1000),
          creditsUsed: result.credits_used || creditCost,
          swapType: 'single',
        };

        console.log('🎉 Face swap completed successfully:', swapResult);
        setResult(swapResult);
        setCurrentStep('result');
        setProcessingProgress(100);
        setTaskStatus('완료!');
        setIsProcessing(false);
        onSwapComplete(swapResult);
      } else {
        // Failed
        throw new Error(result.error || `작업이 실패했습니다: ${result.status}`);
      }

    } catch (error) {
      console.error('❌ Face swap failed:', error);
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setErrorMessage(message);
      setIsProcessing(false);
      setTaskStatus('실패');
      setProcessingProgress(0);
      alert(`얼굴 바꾸기에 실패했습니다: ${message}`);
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
    setCurrentTask(null);
    setCurrentStep('upload');
  };

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
        <h2 className="text-3xl font-bold text-gray-900 mb-4">단일 얼굴 바꾸기 (개선됨)</h2>
        <p className="text-gray-600 text-lg mb-2">원본 이미지와 바꿀 얼굴 이미지를 업로드하세요</p>
        <p className="text-sm text-blue-600 font-medium">💡 정면을 바라보는 선명한 사진일수록 결과가 좋아요!</p>
        <p className="text-xs text-green-600 font-medium mt-2">🔧 서버측 API를 사용하여 더 안정적인 처리</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 원본 이미지 업로드 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">원본 이미지</h3>
          <div
            className={`border-2 border-dashed rounded-2xl p-8 transition-all duration-200 cursor-pointer ${
              dragOver === 'original'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onDragOver={(e) => handleDragOver(e, 'original')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'original')}
            onClick={() => originalInputRef.current?.click()}
          >
            {originalImage ? (
              <div className="relative">
                <img src={originalImage} alt="원본 이미지" className="w-full h-48 object-cover rounded-xl" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOriginalImage('');
                    setOriginalFile(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">얼굴이 바뀔 원본 이미지</p>
                <div className="bg-blue-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-600 transition-colors inline-block">
                  이미지 선택
                </div>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">바꿀 얼굴 이미지</h3>
          <div
            className={`border-2 border-dashed rounded-2xl p-8 transition-all duration-200 cursor-pointer ${
              dragOver === 'face'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
            }`}
            onDragOver={(e) => handleDragOver(e, 'face')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'face')}
            onClick={() => faceInputRef.current?.click()}
          >
            {faceImage ? (
              <div className="relative">
                <img src={faceImage} alt="얼굴 이미지" className="w-full h-48 object-cover rounded-xl" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFaceImage('');
                    setFaceFile(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">원본에 적용할 얼굴 이미지</p>
                <div className="bg-green-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-green-600 transition-colors inline-block">
                  얼굴 선택
                </div>
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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">미리보기</h2>
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">원본 이미지</h3>
          <img src={originalImage} alt="원본" className="w-full h-64 object-cover rounded-xl" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">바꿀 얼굴</h3>
          <img src={faceImage} alt="얼굴" className="w-full h-64 object-cover rounded-xl" />
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => setCurrentStep('upload')}
          className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
        >
          다시 선택
        </button>
        <button
          onClick={handleSwap}
          disabled={!canAffordSwap || isProcessing}
          className={`px-8 py-3 rounded-xl font-semibold transition-colors ${
            canAffordSwap && !isProcessing
              ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white hover:from-blue-600 hover:to-green-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Wand2 className="w-5 h-5 inline-block mr-2" />
          {!canAffordSwap ? '크레딧 부족' : '얼굴 바꾸기 시작'}
          {canAffordSwap && !isDevelopment && ` (${creditCost} 크레딧)`}
          {canAffordSwap && isDevelopment && ' (개발환경 - 무료)'}
        </button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <RefreshCw className="w-12 h-12 text-white animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">AI가 얼굴을 바꾸고 있어요...</h2>
        <p className="text-gray-600 mb-6">{taskStatus}</p>
        
        {/* Progress bar */}
        <div className="w-full max-w-md mx-auto mb-6">
          <div className="bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${processingProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">{processingProgress}% 완료</p>
        </div>

        {/* Current task info */}
        {currentTask && (
          <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-600">
              <strong>상태:</strong> {currentTask.status}
            </p>
            {currentTask.error && (
              <p className="text-sm text-red-600 mt-1">
                <strong>오류:</strong> {currentTask.error}
              </p>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg max-w-md mx-auto mt-4">
            <AlertCircle className="w-5 h-5 inline-block mr-2" />
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );

  const renderResultStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Download className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">완성! 🎉</h2>
        <p className="text-gray-600 text-lg">AI가 생성한 결과를 확인해 보세요</p>
      </div>

      {result && (
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="max-w-2xl mx-auto">
              <BeforeAfterSlider
                beforeImage={result.originalImage}
                afterImage={result.swappedImage}
                className="rounded-xl shadow-lg border border-gray-200"
              />
            </div>
            
            {/* Result image as main display */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">생성된 이미지</h3>
              <div className="max-w-md mx-auto">
                <img 
                  src={result.swappedImage} 
                  alt="AI 얼굴 바꾸기 결과" 
                  className="w-full h-auto rounded-xl shadow-lg border border-gray-200"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-blue-800 font-semibold text-lg">{result.processingTime}초</p>
                <p className="text-blue-600 text-sm">처리 시간</p>
              </div>
              <div>
                <p className="text-blue-800 font-semibold text-lg">{result.creditsUsed} 크레딧</p>
                <p className="text-blue-600 text-sm">사용됨</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleRetry}
          className="flex items-center justify-center space-x-2 bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
        >
          <RefreshCw className="w-5 h-5" />
          <span>다시 시도</span>
        </button>
        {result?.swappedImage && (
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = result.swappedImage;
              link.download = `faceswap-result-${Date.now()}.jpg`;
              link.click();
            }}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-200 hover:scale-105 hover:from-green-600 hover:to-blue-600"
          >
            <Download className="w-5 h-5" />
            <span>이미지 다운로드</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            뒤로 가기
          </button>
          <div className="text-sm text-gray-600">
            크레딧: {user.credits} | 무료 시도: {user.freeTrialsUsed}/{user.maxFreeTrials}
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'preview' && renderPreviewStep()}
          {currentStep === 'processing' && renderProcessingStep()}
          {currentStep === 'result' && renderResultStep()}
        </div>
      </div>
    </div>
  );
};

export default SingleFaceSwapImproved;