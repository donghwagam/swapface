import React from 'react';
import { Upload, Video, Play, Wand2, Download, RefreshCw, ArrowLeft, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { VIDEO_TEMPLATES } from '../utils/constants';
import type { User as UserType, VideoSwapResult } from '../types';

interface VideoFaceSwapProps {
  user: UserType;
  onBack: () => void;
  onSwapComplete: (result: VideoSwapResult) => void;
  onCreditDeduct: () => boolean;
}

type FlowStep = 'mode-select' | 'upload' | 'preview' | 'processing' | 'result';
type VideoMode = 'upload' | 'template';

/**
 * 비디오 얼굴 바꾸기 컴포넌트
 */
export const VideoFaceSwap: React.FC<VideoFaceSwapProps> = ({
  user,
  onBack,
  onSwapComplete,
  onCreditDeduct,
}) => {
  const [currentStep, setCurrentStep] = React.useState<FlowStep>('mode-select');
  const [videoMode, setVideoMode] = React.useState<VideoMode>('upload');
  const [uploadedVideo, setUploadedVideo] = React.useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>('');
  const [faceImage, setFaceImage] = React.useState<string>('');
  const [dragOver, setDragOver] = React.useState<string>('');
  const [processingProgress, setProcessingProgress] = React.useState<number>(0);
  const [result, setResult] = React.useState<VideoSwapResult | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const faceInputRef = React.useRef<HTMLInputElement>(null);

  const creditCost = 5;
  const canAffordSwap = user.freeTrialsUsed < user.maxFreeTrials || user.credits >= creditCost;

  const handleDragOver = (e: React.DragEvent, type: string): void => {
    e.preventDefault();
    setDragOver(type);
  };

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragOver('');
  };

  const handleDrop = (e: React.DragEvent, type: 'video' | 'face'): void => {
    e.preventDefault();
    setDragOver('');
    handleFiles(e.dataTransfer.files, type);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'face'): void => {
    if (e.target.files) {
      handleFiles(e.target.files, type);
    }
  };

  const handleFiles = (files: FileList, type: 'video' | 'face'): void => {
    const file = files[0];
    if (!file) return;

    if (type === 'video' && !file.type.startsWith('video/')) {
      alert('비디오 파일만 업로드할 수 있습니다.');
      return;
    }

    if (type === 'face' && !file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileUrl = e.target?.result as string;
      if (type === 'video') {
        setUploadedVideo(fileUrl);
      } else {
        setFaceImage(fileUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTemplateSelect = (templateId: string): void => {
    setSelectedTemplate(templateId);
    setVideoMode('template');
    setCurrentStep('upload');
  };

  const handleSwap = (): void => {
    if (!canAffordSwap) {
      alert('크레딧이 부족합니다. 크레딧을 충전해 주세요.');
      return;
    }

    if (!faceImage) {
      alert('얼굴 이미지를 업로드해 주세요.');
      return;
    }

    if (videoMode === 'upload' && !uploadedVideo) {
      alert('비디오를 업로드해 주세요.');
      return;
    }

    if (!onCreditDeduct()) {
      alert('크레딧 차감에 실패했습니다.');
      return;
    }

    setCurrentStep('processing');
    setProcessingProgress(0);

    const progressInterval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          setTimeout(() => {
            const template = VIDEO_TEMPLATES.find(t => t.id === selectedTemplate);
            const swapResult: VideoSwapResult = {
              originalVideo: uploadedVideo || template?.thumbnail || '',
              swappedVideo: uploadedVideo || template?.thumbnail || '',
              processingTime: 8.5,
              creditsUsed: creditCost,
              duration: template?.duration || 15,
            };
            setResult(swapResult);
            setCurrentStep('result');
            onSwapComplete(swapResult);
          }, 1000);
          return 100;
        }
        return prev + Math.random() * 8;
      });
    }, 300);
  };

  const handleRetry = (): void => {
    setUploadedVideo('');
    setFaceImage('');
    setSelectedTemplate('');
    setResult(null);
    setProcessingProgress(0);
    setCurrentStep('mode-select');
  };

  const canProceed = faceImage && (uploadedVideo || selectedTemplate);

  React.useEffect(() => {
    if (canProceed && currentStep === 'upload') {
      setCurrentStep('preview');
    }
  }, [canProceed, currentStep]);

  const renderModeSelectStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Video className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">비디오 얼굴 바꾸기</h2>
        <p className="text-gray-600 text-lg mb-2">비디오를 직접 업로드하거나 템플릿을 선택하세요</p>
        <p className="text-sm text-blue-600 font-medium">💡 템플릿을 사용하면 더 빠르고 쉽게 만들 수 있어요!</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* 비디오 업로드 */}
        <div
          className={`border-2 rounded-2xl p-8 cursor-pointer transition-all duration-200 ${
            videoMode === 'upload' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
          onClick={() => {
            setVideoMode('upload');
            setCurrentStep('upload');
          }}
        >
          <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">비디오 업로드</h3>
          <p className="text-gray-600 mb-4">내 비디오에서 얼굴을 바꿔보세요</p>
          <div className="text-sm text-gray-500">
            <p>• 최대 30초, 100MB</p>
            <p>• MP4, MOV, AVI 지원</p>
            <p>• HD 품질 출력</p>
          </div>
        </div>

        {/* 템플릿 선택 */}
        <div
          className={`border-2 rounded-2xl p-8 cursor-pointer transition-all duration-200 ${
            videoMode === 'template' 
              ? 'border-purple-500 bg-purple-50' 
              : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
          }`}
          onClick={() => setVideoMode('template')}
        >
          <Play className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">템플릿 사용</h3>
          <p className="text-gray-600 mb-4">준비된 템플릿으로 빠르게 제작</p>
          <div className="text-sm text-gray-500">
            <p>• 다양한 상황별 템플릿</p>
            <p>• 최적화된 품질</p>
            <p>• 빠른 처리 속도</p>
          </div>
        </div>
      </div>

      {/* 템플릿 목록 */}
      {videoMode === 'template' && (
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-6">템플릿 선택</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {VIDEO_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className={`relative cursor-pointer rounded-xl overflow-hidden transition-all duration-200 hover:scale-105 ${
                  selectedTemplate === template.id ? 'ring-4 ring-purple-500' : ''
                }`}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <img
                  src={template.thumbnail}
                  alt={template.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Play className="w-12 h-12 text-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <h4 className="text-white font-semibold">{template.title}</h4>
                  <p className="text-white/80 text-sm">{template.duration}초</p>
                </div>
                {selectedTemplate === template.id && (
                  <div className="absolute top-2 right-2 bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderUploadStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Video className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {videoMode === 'upload' ? '비디오 및 얼굴 업로드' : '얼굴 이미지 업로드'}
        </h2>
        <p className="text-gray-600 text-lg">
          {videoMode === 'upload' 
            ? '비디오와 바꿀 얼굴 이미지를 업로드하세요' 
            : '선택한 템플릿에 적용할 얼굴 이미지를 업로드하세요'
          }
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 비디오 업로드 (업로드 모드일 때만) */}
        {videoMode === 'upload' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">비디오 파일</h3>
            <div
              className={`border-2 border-dashed rounded-2xl p-8 transition-all duration-200 ${
                dragOver === 'video'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
              }`}
              onDragOver={(e) => handleDragOver(e, 'video')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'video')}
            >
              {uploadedVideo ? (
                <div className="relative">
                  <video src={uploadedVideo} className="w-full h-48 object-cover rounded-xl" controls />
                  <button
                    onClick={() => setUploadedVideo('')}
                    className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">비디오 파일을 선택하세요</p>
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="bg-red-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-red-600 transition-colors"
                  >
                    비디오 선택
                  </button>
                  <p className="text-xs text-gray-500 mt-2">MP4, MOV, AVI (최대 30초, 100MB)</p>
                </>
              )}
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => handleFileSelect(e, 'video')}
              className="hidden"
            />
          </div>
        )}

        {/* 선택된 템플릿 표시 (템플릿 모드일 때) */}
        {videoMode === 'template' && selectedTemplate && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">선택된 템플릿</h3>
            <div className="relative rounded-xl overflow-hidden">
              {(() => {
                const template = VIDEO_TEMPLATES.find(t => t.id === selectedTemplate);
                return template ? (
                  <>
                    <img src={template.thumbnail} alt={template.title} className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <h4 className="text-white font-semibold">{template.title}</h4>
                      <p className="text-white/80 text-sm">{template.duration}초</p>
                    </div>
                  </>
                ) : null;
              })()}
            </div>
          </div>
        )}

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
                <p className="text-xs text-gray-500 mt-2">JPG, PNG (최대 10MB)</p>
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
        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Play className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">미리보기</h2>
        <p className="text-gray-600 text-lg">업로드한 파일을 확인하고 비디오 얼굴 바꾸기를 시작하세요</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="relative">
          {videoMode === 'upload' ? (
            <video src={uploadedVideo} className="w-full h-64 object-cover rounded-xl shadow-lg" controls />
          ) : (
            (() => {
              const template = VIDEO_TEMPLATES.find(t => t.id === selectedTemplate);
              return template ? (
                <div className="relative">
                  <img src={template.thumbnail} alt={template.title} className="w-full h-64 object-cover rounded-xl shadow-lg" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                </div>
              ) : null;
            })()
          )}
          <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
            {videoMode === 'upload' ? '업로드 비디오' : '선택된 템플릿'}
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
          disabled={!canAffordSwap}
          className={`w-full py-4 px-8 rounded-full text-lg font-semibold transition-all duration-200 ${
            canAffordSwap
              ? 'bg-gradient-to-r from-red-500 to-purple-500 text-white hover:shadow-xl hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            <Wand2 className="w-6 h-6" />
            <span>비디오 얼굴 바꾸기 시작 ({creditCost} 크레딧)</span>
          </div>
        </button>

        <button
          onClick={() => setCurrentStep('upload')}
          className="text-gray-600 hover:text-gray-800 font-medium"
        >
          다른 파일 선택하기
        </button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Wand2 className="w-12 h-12 text-white animate-spin" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">비디오 처리 중...</h2>
        <p className="text-gray-600 text-lg">비디오의 모든 프레임을 처리하고 있어요. 조금 더 기다려 주세요!</p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-red-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${processingProgress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mb-8">{Math.round(processingProgress)}% 완료</p>
      </div>

      <div className="space-y-3 text-sm text-gray-500">
        <p className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
          <span>비디오 프레임 분석 중...</span>
        </p>
        <p className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150"></div>
          <span>각 프레임별 얼굴 인식 및 변환 중...</span>
        </p>
        <p className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-300"></div>
          <span>최종 비디오 렌더링 및 최적화 중...</span>
        </p>
      </div>
    </div>
  );

  const renderResultStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Download className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">비디오 얼굴 바꾸기 완성! 🎉</h2>
        <p className="text-gray-600 text-lg">AI가 생성한 비디오 결과를 확인해 보세요</p>
      </div>

      {result && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="relative">
              <video src={result.originalVideo} className="w-full h-64 object-cover rounded-xl shadow-lg" controls />
              <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                원본 비디오
              </div>
            </div>
            <div className="relative">
              <video src={result.swappedVideo} className="w-full h-64 object-cover rounded-xl shadow-lg" controls />
              <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                변환된 비디오
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-4 mb-6">
            <p className="text-red-800 font-medium">
              {result.creditsUsed} 크레딧이 차감되었습니다. (보유: {user.credits})
            </p>
            <p className="text-red-600 text-sm mt-1">
              처리 시간: {result.processingTime}초 | 비디오 길이: {result.duration}초
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={handleRetry}
              className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              <span>다시 시도하기</span>
            </button>

            <button className="flex items-center justify-center space-x-2 bg-gradient-to-r from-red-500 to-purple-500 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105">
              <Download className="w-5 h-5" />
              <span>다운로드</span>
            </button>

            <button className="flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 px-6 py-3 rounded-full font-semibold hover:bg-blue-200 transition-colors">
              <span>공유하기</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-purple-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-8 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>뒤로가기</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {currentStep === 'mode-select' && renderModeSelectStep()}
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'preview' && renderPreviewStep()}
          {currentStep === 'processing' && renderProcessingStep()}
          {currentStep === 'result' && renderResultStep()}
        </div>
      </div>
    </div>
  );
};