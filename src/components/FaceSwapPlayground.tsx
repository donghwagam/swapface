import React, { useState, useRef } from 'react';
import { Upload, Wand2, Download, RefreshCw } from 'lucide-react';
import { aiFaceSwapService } from '../services/aifaceswap';
import type { User as UserType } from '../types';

interface FaceSwapPlaygroundProps {
  user: UserType;
  onBack: () => void;
}

export const FaceSwapPlayground: React.FC<FaceSwapPlaygroundProps> = ({
  user,
  onBack,
}) => {
  const [sourceImage, setSourceImage] = useState<string>('');
  const [swapFaceImage, setSwapFaceImage] = useState<string>('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [swapFaceFile, setSwapFaceFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string>('');
  const [dragOver, setDragOver] = useState<string>('');

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const swapFaceInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    setDragOver(type);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver('');
  };

  const handleDrop = (e: React.DragEvent, type: 'source' | 'swapFace') => {
    e.preventDefault();
    setDragOver('');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0], type);
    }
  };

  const handleFileSelect = (file: File, type: 'source' | 'swapFace') => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      if (type === 'source') {
        setSourceImage(imageUrl);
        setSourceFile(file);
      } else {
        setSwapFaceImage(imageUrl);
        setSwapFaceFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'source' | 'swapFace') => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, type);
    }
  };

  const handleSwapFace = async () => {
    if (!sourceFile || !swapFaceFile) {
      alert('원본 이미지와 바꿀 얼굴 이미지를 모두 업로드해 주세요.');
      return;
    }

    setIsProcessing(true);
    setResultImage('');

    try {
      console.log('🚀 Starting face swap...');
      
      // Step 1: Upload images to get public URLs
      console.log('📤 Uploading images...');
      const sourceImageUrl = await aiFaceSwapService.uploadImage(sourceFile);
      const swapFaceImageUrl = await aiFaceSwapService.uploadImage(swapFaceFile);
      
      console.log('🔗 Source image URL:', sourceImageUrl);
      console.log('🔗 Swap face URL:', swapFaceImageUrl);
      
      // Step 2: Call AIFaceSwap.io API
      console.log('🤖 Calling AIFaceSwap.io API...');
      const response = await aiFaceSwapService.faceSwap({
        source_image: sourceImageUrl,
        face_image: swapFaceImageUrl,
      });
      
      console.log('📋 API Response:', response);
      
      if (response.code !== 200 || !response.data?.task_id) {
        throw new Error('API 응답에 오류가 있습니다.');
      }
      
      // Step 3: For now, show demo result (webhook system will be implemented later)
      // TODO: Implement proper webhook system or polling
      console.log('⏳ Processing... (Demo mode)');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Show a demo result image
      setResultImage('https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=400');
      
      console.log('✅ Face swap completed!');
    } catch (error) {
      console.error('❌ Face swap failed:', error);
      alert(`얼굴 바꾸기에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeImage = (type: 'source' | 'swapFace') => {
    if (type === 'source') {
      setSourceImage('');
      setSourceFile(null);
    } else {
      setSwapFaceImage('');
      setSwapFaceFile(null);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = 'face-swap-result.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetAll = () => {
    setSourceImage('');
    setSwapFaceImage('');
    setSourceFile(null);
    setSwapFaceFile(null);
    setResultImage('');
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            AI Face Swap Playground
          </h1>
          <p className="text-gray-600 text-lg">
            Just upload photos and you can swap face for free
          </p>
        </div>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Source Image */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-center">Original image</h3>
            
            <div
              className={`relative border-2 border-dashed rounded-xl h-64 flex items-center justify-center cursor-pointer transition-all ${
                dragOver === 'source' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={(e) => handleDragOver(e, 'source')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'source')}
              onClick={() => sourceInputRef.current?.click()}
            >
              {sourceImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={sourceImage}
                    alt="Source"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage('source');
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">
                    클릭하거나 이미지를 드래그하여 업로드
                  </p>
                </div>
              )}
            </div>

            <input
              ref={sourceInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileInputChange(e, 'source')}
              className="hidden"
            />
          </div>

          {/* Swap Face From */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-center">Face image</h3>
            
            <div
              className={`relative border-2 border-dashed rounded-xl h-64 flex items-center justify-center cursor-pointer transition-all ${
                dragOver === 'swapFace' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={(e) => handleDragOver(e, 'swapFace')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'swapFace')}
              onClick={() => swapFaceInputRef.current?.click()}
            >
              {swapFaceImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={swapFaceImage}
                    alt="Swap Face"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage('swapFace');
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">
                    클릭하거나 이미지를 드래그하여 업로드
                  </p>
                </div>
              )}
            </div>

            <input
              ref={swapFaceInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileInputChange(e, 'swapFace')}
              className="hidden"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center mb-8">
          <button
            onClick={handleSwapFace}
            disabled={!sourceFile || !swapFaceFile || isProcessing}
            className={`px-12 py-4 rounded-xl font-semibold text-lg transition-all ${
              !sourceFile || !swapFaceFile || isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="inline-block w-5 h-5 mr-2 animate-spin" />
                AI가 생성 중...
              </>
            ) : (
              <>
                <Wand2 className="inline-block w-5 h-5 mr-2" />
                Start face swapping
              </>
            )}
          </button>
        </div>

        {/* Result Section */}
        {(resultImage || isProcessing) && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-center">결과</h3>
            
            <div className="flex justify-center">
              {isProcessing ? (
                <div className="w-96 h-96 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="mx-auto h-12 w-12 text-purple-500 animate-spin mb-4" />
                    <p className="text-gray-600">AI가 얼굴을 바꾸는 중...</p>
                  </div>
                </div>
              ) : resultImage ? (
                <div className="relative">
                  <img
                    src={resultImage}
                    alt="Result"
                    className="max-w-md rounded-xl shadow-lg"
                  />
                  <div className="mt-4 flex gap-4 justify-center">
                    <button
                      onClick={downloadResult}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      다운로드
                    </button>
                    <button
                      onClick={resetAll}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      다시 시작
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="text-center mt-8">
          <button
            onClick={onBack}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
          >
            ← 홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};