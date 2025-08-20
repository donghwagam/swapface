import React from 'react';
import { User, Users, Video, Star, ArrowRight } from 'lucide-react';
import { SWAP_MODES } from '../utils/constants';
import type { SwapMode } from '../types';

interface SwapModeSelectorProps {
  onModeSelect: (mode: SwapMode) => void;
}

const iconMap = {
  User,
  Users,
  Video,
};

/**
 * 얼굴 바꾸기 모드 선택 컴포넌트
 */
export const SwapModeSelector: React.FC<SwapModeSelectorProps> = ({ onModeSelect }) => {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            어떤 방식으로 얼굴을 바꿔볼까요?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            단일 얼굴부터 그룹 사진, 심지어 동영상까지! 
            원하는 방식을 선택하고 AI의 놀라운 기술을 경험해보세요.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {SWAP_MODES.map((mode) => {
            const IconComponent = iconMap[mode.icon as keyof typeof iconMap];
            
            return (
              <div
                key={mode.id}
                className={`relative bg-white rounded-2xl shadow-xl p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer group ${
                  mode.isPopular ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => onModeSelect(mode.id)}
              >
                {/* 인기 배지 */}
                {mode.isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center space-x-1">
                      <Star className="w-4 h-4" />
                      <span>가장 인기!</span>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  {/* 아이콘 */}
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-10 h-10 text-white" />
                  </div>

                  {/* 제목 */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{mode.title}</h3>
                  
                  {/* 설명 */}
                  <p className="text-gray-600 mb-6 leading-relaxed">{mode.description}</p>

                  {/* 크레딧 비용 */}
                  <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {mode.creditCost} 크레딧
                    </div>
                    <div className="text-sm text-blue-700">사용당</div>
                  </div>

                  {/* 기능 목록 */}
                  <ul className="space-y-2 mb-8">
                    {mode.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* 선택 버튼 */}
                  <button className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-full font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 group-hover:scale-105">
                    <span>시작하기</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 추가 정보 */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">💡 어떤 모드를 선택해야 할까요?</h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-600">단일 얼굴 바꾸기</h4>
                <p className="text-sm text-gray-600">프로필 사진이나 개인 사진에 적합</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600">다중 얼굴 바꾸기</h4>
                <p className="text-sm text-gray-600">가족사진이나 단체사진에 적합</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-600">비디오 얼굴 바꾸기</h4>
                <p className="text-sm text-gray-600">SNS 콘텐츠나 재미있는 영상 제작에 적합</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};