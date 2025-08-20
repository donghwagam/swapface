import React from 'react';
import { Upload, Users, Wand2, Download, RefreshCw, ArrowLeft, AlertCircle, Plus, X } from 'lucide-react';
import type { User as UserType, MultiFaceSwapResult } from '../types';

interface MultiFaceSwapProps {
  user: UserType;
  onBack: () => void;
  onSwapComplete: (result: MultiFaceSwapResult) => void;
  onCreditDeduct: () => boolean;
}

type FlowStep = 'upload' | 'preview' | 'processing' | 'result';

interface FaceSelection {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  replacementImage?: string;
}

/**
 * 다중 얼굴 바꾸기 컴포넌트
 */
export const MultiFaceSwap: React.FC<MultiFaceSwapProps> = ({
  user,
  onBack,
  onSwapComplete,
  onCreditDeduct,
}) => {
  const [currentStep, setCurrentStep] = React.useState<FlowStep>('upload');
  const [originalImage, setOriginalImage] = React.useState<string>('');
  const [faceImages, setFaceImages] = React.useState<string[]>([]);
  const [detectedFaces, setDetectedFaces] = React.useState<FaceSelection[]>([]);
  const [dragOver, setDragOver] = React.useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = React.useState<number>(0);
  const [result, setResult] = React.useState<MultiFaceSwapResult | null>(null);
  const originalInputRef = React.useRef<HTMLInputElement>(null);
  const faceInputRef = React.useRef<HTMLInputElement>(null);

  const creditCost = 3;
  const canAffordSwap = user.freeTrialsUsed < user.maxFreeTrials || user.credits >= creditCost;

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList): void => {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setOriginalImage(imageUrl);
      
      // 가상의 얼굴 감지 (실제로는 AI API 호출)
      setTimeout(() => {
        const mockFaces: FaceSelection[] = [
          { id: '1', x: 20, y: 15, width: 25, height: 35 },
          { id: '2', x: 55, y: 20, width: 25, height: 35 },
          { id: '3', x: 15, y: 55, width: 20, height: 30 },
          { id: '4', x: 65, y: 60, width: 20, height: 30 },
        ];
        setDetectedFaces(mockFaces);
        setCurrentStep('preview');
      }, 1000);
    };
    reader.readAsDataURL(file);
  };

  const handleFaceImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const readers = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then((imageUrls) => {
        setFaceImages(prev => [...prev, ...imageUrls]);
      });
    }
  };

  const assignFaceToSelection = (faceId: string, imageUrl: string): void => {
    setDetectedFaces(prev => 
      prev.map(face => 
        face.id === faceId 
          ? { ...face, replacementImage: imageUrl }
          : face
      )
    );
  };

  const removeFaceImage = (index: number): void => {
    setFaceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSwap = (): void => {
    if (!canAffordSwap) {
      alert('크레딧이 부족합니다. 크레딧을 충전해 주세요.');
      return;
    }

    const assignedFaces = detectedFaces.filter(face => face.replacementImage);
    if (assignedFaces.length === 0) {
      alert('최소 하나의 얼굴에 대체 이미지를 지정해주세요.');
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
            const swapResult: MultiFaceSwapResult = {
              originalImage,
              swappedImage: originalImage, // 실제로는 처리된 이미지
              processingTime: 5.2,
              creditsUsed: creditCost,
              facesDetected: detectedFaces.length,
              facesSwapped: assignedFaces.length,
            };
            setResult(swapResult);
            setCurrentStep('result');
            onSwapComplete(swapResult);
          }, 1000);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 200);
  };

  const handleRetry = (): void => {
    setOriginalImage('');
    setFaceImages([]);
    setDetectedFaces([]);
    setResult(null);
    setProcessingProgress(0);
    setCurrentStep('upload');
  };

  const renderUploadStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">다중 얼굴 바꾸기</h2>
        <p className="text-gray-600 text-lg mb-2">여러 명의 얼굴이 있는 사진을 업로드하세요</p>
        <p className="text-sm text-blue-600 font-medium">💡 최대 10명까지 동시에 얼굴을 바꿀 수 있어요!</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-2xl p-12 transition-all duration-200 ${
          dragOver
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {originalImage ? (
          <div className="relative">
            <img src={originalImage} alt="원본 이미지" className="w-full max-h-96 object-contain rounded-xl" />
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              얼굴 감지 중...
            </div>
          </div>
        ) : (
          <>
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">그룹 사진을 드래그하여 놓거나 클릭하여 선택하세요</p>
            <button
              onClick={() => originalInputRef.current?.click()}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              사진 선택하기
            </button>
          </>
        )}
      </div>

      <input
        ref={originalInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="mt-8 text-sm text-gray-500">
        <p>지원 형식: JPG, PNG (최대 10MB)</p>
        <p>더 많은 얼굴이 감지될수록 처리 시간이 길어질 수 있습니다</p>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div>
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">얼굴 선택 및 매칭</h2>
        <p className="text-gray-600 text-lg">감지된 얼굴에 대체할 이미지를 지정하세요</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 원본 이미지와 얼굴 감지 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            감지된 얼굴 ({detectedFaces.length}개)
          </h3>
          <div className="relative bg-gray-100 rounded-xl overflow-hidden">
            <img src={originalImage} alt="원본 이미지" className="w-full" />
            {detectedFaces.map((face) => (
              <div
                key={face.id}
                className={`absolute border-2 rounded cursor-pointer transition-all ${
                  face.replacementImage 
                    ? 'border-green-500 bg-green-500/20' 
                    : 'border-red-500 bg-red-500/20'
                }`}
                style={{
                  left: `${face.x}%`,
                  top: `${face.y}%`,
                  width: `${face.width}%`,
                  height: `${face.height}%`,
                }}
              >
                <div className="absolute -top-6 left-0 bg-white px-2 py-1 rounded text-xs font-semibold">
                  얼굴 {face.id}
                </div>
                {face.replacementImage && (
                  <img 
                    src={face.replacementImage} 
                    alt={`대체 얼굴 ${face.id}`}
                    className="w-full h-full object-cover opacity-50"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 얼굴 이미지 업로드 및 매칭 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">대체할 얼굴 이미지</h3>
            <button
              onClick={() => faceInputRef.current?.click()}
              className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>추가</span>
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {faceImages.map((image, index) => (
              <div key={index} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-xl">
                <img src={image} alt={`얼굴 ${index + 1}`} className="w-16 h-16 object-cover rounded-lg" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">얼굴 이미지 {index + 1}</p>
                  <div className="flex space-x-2 mt-2">
                    {detectedFaces.map((face) => (
                      <button
                        key={face.id}
                        onClick={() => assignFaceToSelection(face.id, image)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          face.replacementImage === image
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        얼굴 {face.id}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => removeFaceImage(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <input
            ref={faceInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFaceImageUpload}
            className="hidden"
          />

          {faceImages.length === 0 && (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
              <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">대체할 얼굴 이미지를 추가하세요</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {!canAffordSwap && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">크레딧이 부족합니다. 크레딧을 충전한 후 이용해 주세요.</p>
          </div>
        )}
        
        <button
          onClick={handleSwap}
          disabled={!canAffordSwap || detectedFaces.filter(f => f.replacementImage).length === 0}
          className={`w-full py-4 px-8 rounded-full text-lg font-semibold transition-all duration-200 ${
            canAffordSwap && detectedFaces.filter(f => f.replacementImage).length > 0
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-xl hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            <Wand2 className="w-6 h-6" />
            <span>
              다중 얼굴 바꾸기 시작 ({creditCost} 크레딧)
            </span>
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
        <h2 className="text-3xl font-bold text-gray-900 mb-4">다중 얼굴 처리 중...</h2>
        <p className="text-gray-600 text-lg">여러 얼굴을 동시에 처리하고 있어요. 조금 더 기다려 주세요!</p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${processingProgress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mb-8">{Math.round(processingProgress)}% 완료</p>
      </div>

      <div className="space-y-3 text-sm text-gray-500">
        <p className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
          <span>각 얼굴 영역 분석 중...</span>
        </p>
        <p className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
          <span>AI 모델로 다중 얼굴 변환 중...</span>
        </p>
        <p className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-300"></div>
          <span>자연스러운 합성을 위한 후처리 중...</span>
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
        <h2 className="text-3xl font-bold text-gray-900 mb-4">다중 얼굴 바꾸기 완성! 🎉</h2>
        <p className="text-gray-600 text-lg">AI가 생성한 결과를 확인해 보세요</p>
      </div>

      {result && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="relative">
              <img src={result.originalImage} alt="원본 이미지" className="w-full h-64 object-cover rounded-xl shadow-lg" />
              <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                원본 ({result.facesDetected}명)
              </div>
            </div>
            <div className="relative">
              <img src={result.swappedImage} alt="변환된 이미지" className="w-full h-64 object-cover rounded-xl shadow-lg" />
              <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                결과 ({result.facesSwapped}명 변환)
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 mb-6">
            <p className="text-purple-800 font-medium">
              {result.creditsUsed} 크레딧이 차감되었습니다. (보유: {user.credits})
            </p>
            <p className="text-purple-600 text-sm mt-1">
              처리 시간: {result.processingTime}초 | 감지된 얼굴: {result.facesDetected}개 | 변환된 얼굴: {result.facesSwapped}개
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

            <button className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
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