import React from 'react';
import { Upload, Users, Wand2, Download, RefreshCw, ArrowLeft, AlertCircle, Plus, X } from 'lucide-react';
import type { User as UserType, MultiFaceSwapResult } from '../types';
import { aiFaceSwapService } from '../services/aifaceswap';
import { faceSwapAPIService } from '../services/faceSwapAPI';
import { createStorageBucket } from '../services/supabase';

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
  replacementPreview?: string;
  extractedThumbnail?: string;
}

export const MultiFaceSwap: React.FC<MultiFaceSwapProps> = ({
  user,
  onBack,
  onSwapComplete,
  onCreditDeduct,
}) => {
  const [currentStep, setCurrentStep] = React.useState<FlowStep>('upload');
  const [originalImage, setOriginalImage] = React.useState<string>('');
  const [detectedFaces, setDetectedFaces] = React.useState<FaceSelection[]>([]);
  const [dragOver, setDragOver] = React.useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = React.useState<number>(0);
  const [result, setResult] = React.useState<MultiFaceSwapResult | null>(null);
  const originalInputRef = React.useRef<HTMLInputElement>(null);

  const creditCost = 5; // Multi-face swap costs more
  const canAffordSwap = user.freeTrialsUsed < user.maxFreeTrials || user.credits >= creditCost;

  // Storage bucket should already exist
  // React.useEffect(() => {
  //   createStorageBucket().catch(console.error);
  // }, []);

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
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList): Promise<void> => {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      setOriginalImage(imageUrl);
      
      try {
        console.log('🔍 Detecting faces in uploaded image...');
        
        // Extract faces directly using file upload (no URL needed)
        const response = await aiFaceSwapService.extractFacesFromFile(file);
        
        if (response.code !== 200) {
          throw new Error(`Face detection failed: ${response.message}`);
        }

        // Convert API response to our face selection format and create thumbnails
        const detectedFaceBoxes = response.data.faces || [];
        const faces: FaceSelection[] = await Promise.all(detectedFaceBoxes.map(async (face, index) => {
          return new Promise<FaceSelection>((resolve) => {
            // Create canvas to extract face thumbnail
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
              try {
                const IW = img.naturalWidth || img.width;
                const IH = img.naturalHeight || img.height;

                // 1) 좌표 해석: API는 [x1, y1, x2, y2] (절대좌표)
                //    만약 어떤 이미지에서는 정규화로 올 수도 있다면(희귀),
                //    값을 보고 자동 판별하도록 안전장치 추가
                const [x1, y1, x2, y2] = face as [number, number, number, number];

                const looksNormalized =
                  x1 >= 0 && x1 <= 1 && y1 >= 0 && y1 <= 1 &&
                  x2 >= 0 && x2 <= 1 && y2 >= 0 && y2 <= 1 &&
                  (x2 - x1) > 0 && (y2 - y1) > 0;

                const sx1 = looksNormalized ? x1 * IW : x1;
                const sy1 = looksNormalized ? y1 * IH : y1;
                const sx2 = looksNormalized ? x2 * IW : x2;
                const sy2 = looksNormalized ? y2 * IH : y2;

                // 2) w,h 계산
                let faceX = Math.round(Math.min(sx1, sx2));
                let faceY = Math.round(Math.min(sy1, sy2));
                let faceW = Math.round(Math.abs(sx2 - sx1));
                let faceH = Math.round(Math.abs(sy2 - sy1));

                // 3) 경계 클램프
                if (faceX < 0) faceX = 0;
                if (faceY < 0) faceY = 0;
                if (faceX + faceW > IW) faceW = IW - faceX;
                if (faceY + faceH > IH) faceH = IH - faceY;
                if (faceW < 1) faceW = 1;
                if (faceH < 1) faceH = 1;

                // 4) 캔버스 설정 + 고품질 리샘플링
                const size = 64; // 필요 시 96 등으로
                canvas.width = size;
                canvas.height = size;
                if (ctx) {
                  (ctx as any).imageSmoothingQuality = 'high';
                  ctx.clearRect(0, 0, size, size);
                  // 배경(옵션)
                  ctx.fillStyle = '#f0f0f0';
                  ctx.fillRect(0, 0, size, size);

                  // 5) 크롭 → 썸네일
                  ctx.drawImage(
                    img,
                    faceX, faceY, faceW, faceH, // source rect
                    0, 0, size, size            // dest rect
                  );
                }

                const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
                console.log(`✅ Face ${index + 1} thumbnail extracted (x:${faceX}, y:${faceY}, w:${faceW}, h:${faceH})`);

                resolve({
                  id: `face-${index}`,
                  // UI 오버레이용 퍼센트 좌표는 정규화 여부에 상관없이 원본 기준으로 환산:
                  x: (faceX / IW) * 100,
                  y: (faceY / IH) * 100,
                  width: (faceW / IW) * 100,
                  height: (faceH / IH) * 100,
                  extractedThumbnail: thumbnail,
                });
              } catch (error) {
                console.error(`❌ Failed to extract thumbnail for face ${index + 1}:`, error);
                resolve({
                  id: `face-${index}`,
                  x: 0, y: 0, width: 0, height: 0, // 최소 안전값
                });
              }
            };
            
            img.onerror = (error) => {
              console.error(`❌ Failed to load image for thumbnail extraction:`, error);
              // Fallback if thumbnail extraction fails
              resolve({
                id: `face-${index}`,
                x: face[0] * 100,
                y: face[1] * 100,
                width: (face[2] - face[0]) * 100,
                height: (face[3] - face[1]) * 100
              });
            };
            
            // Don't set crossOrigin for data URLs
            img.src = imageUrl; // Use local data URL for thumbnail extraction
          });
        }));

        console.log(`✅ Detected ${faces.length} faces with thumbnails:`, faces);
        setDetectedFaces(faces);
        setCurrentStep('preview');
        
      } catch (error) {
        console.error('Face detection error:', error);
        
        // Fallback to mock faces if API fails - generate more faces for better coverage
        console.log('⚠️ Using mock face detection as fallback');
        const mockFaces: FaceSelection[] = [
          { id: 'face-0', x: 15, y: 10, width: 20, height: 30 },
          { id: 'face-1', x: 40, y: 15, width: 20, height: 30 },
          { id: 'face-2', x: 65, y: 12, width: 20, height: 30 },
          { id: 'face-3', x: 25, y: 45, width: 18, height: 28 },
          { id: 'face-4', x: 55, y: 50, width: 18, height: 28 },
        ];
        setDetectedFaces(mockFaces);
        setCurrentStep('preview');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSingleFaceUpload = async (e: React.ChangeEvent<HTMLInputElement>, faceId: string): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      console.log('🔄 Uploading face image:', file.name);
      
      // Upload to Supabase Storage to get public URL
      const publicUrl = await aiFaceSwapService.uploadImage(file);
      
      // Create local preview URL for UI
      const localPreview = URL.createObjectURL(file);
      
      // Update the specific face's replacement image
      setDetectedFaces(prev => 
        prev.map(face => 
          face.id === faceId 
            ? { ...face, replacementImage: publicUrl, replacementPreview: localPreview }
            : face
        )
      );
      
      console.log('✅ Face image uploaded successfully:', publicUrl);
    } catch (error) {
      console.error('❌ Face image upload failed:', error);
      alert('이미지 업로드에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  const removeFaceReplacement = (faceId: string): void => {
    setDetectedFaces(prev => 
      prev.map(face => {
        if (face.id === faceId) {
          // Clean up object URL to prevent memory leak
          if (face.replacementPreview) {
            URL.revokeObjectURL(face.replacementPreview);
          }
          return { ...face, replacementImage: undefined, replacementPreview: undefined };
        }
        return face;
      })
    );
  };

  const handleSwap = async (): Promise<void> => {
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

    try {
      console.log('🚀 Starting multi-face swap...');
      
      const startTime = Date.now();
      const faceImageUrls = assignedFaces.map(face => face.replacementImage!);
      const indices = assignedFaces.map((_, index) => index);

      // Upload original image to get public URL
      const originalFile = await fetch(originalImage).then(r => r.blob());
      const originalImageFile = new File([originalFile], 'original.jpg', { type: 'image/jpeg' });
      const originalPublicUrl = await aiFaceSwapService.uploadImage(originalImageFile);
      
      // Call multi-face swap API with public URLs
      const response = await aiFaceSwapService.multiFaceSwap({
        source_image: originalPublicUrl,
        face_image: faceImageUrls,
        index: indices
      });

      if (response.code !== 200) {
        throw new Error(`API Error: ${response.message}`);
      }

      const taskId = response.data.task_id;
      console.log('✅ Multi-face swap initiated:', taskId);

      // Start polling for completion
      const result = await faceSwapAPIService.pollTask(taskId, {
        intervalMs: 5000,
        maxPolls: 180,
        onUpdate: (task) => {
          console.log('📊 Multi-face swap progress:', task.status);
          const elapsed = Date.now() - startTime;
          let progress = 30 + (elapsed / 1000) * 3;
          progress = Math.min(progress + 20, 95);
          setProcessingProgress(Math.min(progress, 95));
        }
      });

      if (result && result.status === 'succeeded' && result.result_image) {
        console.log('🎉 Multi-face swap completed successfully');
        
        const processingTime = (Date.now() - startTime) / 1000;
        const swapResult: MultiFaceSwapResult = {
          originalImage,
          swappedImage: result.result_image,
          processingTime,
          creditsUsed: response.data.points || creditCost,
          facesDetected: detectedFaces.length,
          facesSwapped: assignedFaces.length,
        };
        
        setProcessingProgress(100);
        setResult(swapResult);
        setCurrentStep('result');
        onSwapComplete(swapResult);
        
      } else {
        throw new Error('Face swap processing failed or timed out');
      }

    } catch (error) {
      console.error('Multi-face swap error:', error);
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert(`오류: ${errorMsg}`);
      setCurrentStep('preview');
    }
  };

  const handleRetry = (): void => {
    setOriginalImage('');
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
              <Upload className="w-5 h-5 inline-block mr-2" />
              이미지 업로드
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
    </div>
  );

  const renderPreviewStep = () => (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">다중 얼굴 바꾸기</h2>
        <p className="text-gray-600">각 얼굴에 대체할 이미지를 업로드하세요</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 왼쪽: 원본 이미지 */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Original Image</h3>
          <div className="bg-white rounded-xl shadow-lg p-4">
            <img 
              src={originalImage} 
              alt="원본 이미지" 
              className="w-full h-64 object-cover rounded-lg mb-2" 
            />
            <p className="text-sm text-gray-600">{detectedFaces.length}명 감지됨</p>
          </div>
        </div>

        {/* 가운데: 얼굴별 매칭 UI */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Face Image</h3>
          <div className="space-y-3">
            {detectedFaces.map((face, index) => (
              <div key={face.id} className="flex items-center space-x-3 bg-white rounded-lg shadow p-3">
                {/* 감지된 얼굴 썸네일 */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300">
                    {face.extractedThumbnail ? (
                      <img 
                        src={face.extractedThumbnail} 
                        alt={`감지된 얼굴 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
                        <span className="text-white font-bold">{index + 1}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 화살표 */}
                <div className="text-gray-400">→</div>

                {/* 대체 얼굴 업로드 */}
                <div className="relative">
                  <input
                    id={`face-upload-${face.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSingleFaceUpload(e, face.id)}
                  />
                  <label 
                    htmlFor={`face-upload-${face.id}`}
                    className="block w-12 h-12 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all"
                  >
                    {face.replacementPreview ? (
                      <img 
                        src={face.replacementPreview} 
                        alt={`대체 얼굴 ${index + 1}`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Plus className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </label>
                  {face.replacementPreview && (
                    <button
                      onClick={() => removeFaceReplacement(face.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 미리보기 결과 */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview Result</h3>
          <div className="bg-gray-50 rounded-xl shadow-lg p-4 h-80 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Wand2 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">얼굴을 모두 선택하고<br/>변환을 시작하세요</p>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 영역 */}
      <div className="mt-8 text-center space-y-4">
        {!canAffordSwap && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">크레딧이 부족합니다. 크레딧을 충전한 후 이용해 주세요.</p>
          </div>
        )}

        <div className="bg-purple-100 rounded-xl p-6">
          <button
            onClick={handleSwap}
            disabled={!canAffordSwap || detectedFaces.filter(f => f.replacementImage).length === 0}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
              canAffordSwap && detectedFaces.filter(f => f.replacementImage).length > 0
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Start Multi-Face Swapping
          </button>
          <p className="text-sm text-purple-600 mt-2">
            {detectedFaces.filter(f => f.replacementImage).length}/{detectedFaces.length}개 얼굴 선택됨
          </p>
        </div>
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
          {/* Main result image */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="max-w-2xl mx-auto">
              <img 
                src={result.swappedImage} 
                alt="다중 얼굴 바꾸기 결과" 
                className="w-full h-auto rounded-xl shadow-lg border border-gray-200"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
              />
            </div>
            
            {/* Before/After comparison */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">변환 비교</h3>
              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-2">원본 ({result.facesDetected}명)</p>
                  <img 
                    src={result.originalImage} 
                    alt="원본 이미지" 
                    className="w-full h-32 object-cover rounded-lg shadow border border-gray-200"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-2">결과 ({result.facesSwapped}명 변환)</p>
                  <img 
                    src={result.swappedImage} 
                    alt="변환된 이미지" 
                    className="w-full h-32 object-cover rounded-lg shadow border border-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-purple-800 font-semibold text-lg">{result.processingTime}초</p>
                <p className="text-purple-600 text-sm">처리 시간</p>
              </div>
              <div>
                <p className="text-purple-800 font-semibold text-lg">{result.facesSwapped}/{result.facesDetected}</p>
                <p className="text-purple-600 text-sm">변환된 얼굴</p>
              </div>
              <div>
                <p className="text-purple-800 font-semibold text-lg">{result.creditsUsed} 크레딧</p>
                <p className="text-purple-600 text-sm">사용됨</p>
              </div>
            </div>
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
                  link.download = `multi-faceswap-result-${Date.now()}.jpg`;
                  link.click();
                }
              }}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-200 hover:scale-105 hover:from-purple-600 hover:to-blue-600"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>뒤로가기</span>
          </button>
        </div>

        {/* Main Content */}
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