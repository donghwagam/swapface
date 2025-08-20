import React from 'react';
import { ArrowRight, Sparkles, Wand2 } from 'lucide-react';
import { EXAMPLE_SWAPS } from '../utils/constants';

interface HeroSectionProps {
  onModeSelect: () => void;
}

/**
 * 랜딩 페이지 히어로 섹션 컴포넌트
 */
export const HeroSection: React.FC<HeroSectionProps> = ({ onModeSelect }) => {
  const [currentExample, setCurrentExample] = React.useState<number>(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExample((prev) => (prev + 1) % EXAMPLE_SWAPS.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0iIzMzNjZmZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz4KPC9zdmc+')] opacity-30"></div>
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* 왼쪽: 텍스트 콘텐츠 */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>AI 기술로 완성하는 완벽한 얼굴 바꾸기</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              AI 얼굴 바꾸기,
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                쉽고 재미있게!
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              최첨단 AI 기술로 몇 초 만에 자연스러운 얼굴 바꾸기를 경험하세요.
              <br className="hidden sm:block" />
              무료 체험 2회 제공! 복잡한 가입 절차 없이 바로 시작하세요.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={onModeSelect}
                className="group bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center space-x-2"
              >
                <Wand2 className="w-5 h-5" />
                <span>AI 얼굴 바꾸기 시작</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="flex items-center space-x-2 text-gray-600">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white"></div>
                  <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white"></div>
                  <div className="w-8 h-8 bg-purple-500 rounded-full border-2 border-white"></div>
                </div>
                <span className="text-sm">이미 <strong>10,000+</strong>명이 사용했어요</span>
              </div>
            </div>
          </div>

          {/* 오른쪽: 예시 이미지 캐러셀 */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                변화 과정을 확인해보세요!
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="relative">
                  <img
                    src={EXAMPLE_SWAPS[currentExample].before}
                    alt="변환 전"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    변환 전
                  </div>
                </div>
                <div className="relative">
                  <img
                    src={EXAMPLE_SWAPS[currentExample].after}
                    alt="변환 후"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                    변환 후
                  </div>
                </div>
              </div>
              
              {/* 인디케이터 */}
              <div className="flex justify-center space-x-2">
                {EXAMPLE_SWAPS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentExample(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentExample ? 'bg-blue-500 w-6' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* 장식 요소 */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-r from-blue-400 to-green-400 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
          </div>
        </div>
      </div>
    </section>
  );
};