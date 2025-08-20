import React from 'react';
import { Upload, Sparkles, CheckCircle } from 'lucide-react';

interface GuidePageProps {
  onBack: () => void;
}

export const GuidePage: React.FC<GuidePageProps> = ({ onBack }) => {
  const steps = [
    {
      icon: Upload,
      title: '1. 이미지 업로드',
      description: '원본 이미지와 바꾸고 싶은 얼굴 이미지를 업로드하세요',
      details: [
        'JPG, PNG 형식을 지원합니다',
        '최대 10MB까지 업로드 가능',
        '얼굴이 선명하게 보이는 이미지를 사용하세요'
      ]
    },
    {
      icon: Sparkles,
      title: '2. AI 처리',
      description: '고급 AI 기술을 통해 자연스럽게 얼굴을 바꿔드립니다',
      details: [
        '평균 30초 이내 처리 완료',
        '고품질 결과물 생성',
        '자연스러운 얼굴 합성'
      ]
    },
    {
      icon: CheckCircle,
      title: '3. 결과 확인',
      description: '완성된 이미지를 확인하고 다운로드하세요',
      details: [
        '원본 해상도로 다운로드',
        '히스토리에 자동 저장',
        '소셜 미디어 공유 가능'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-16">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">사용법 가이드</h1>
          <p className="text-xl text-gray-600">간단한 3단계로 AI 얼굴 바꾸기를 시작하세요</p>
        </div>

        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">사용 방법</h2>
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-start space-x-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600 text-lg mb-4">{step.description}</p>
                    <ul className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">지금 시작해보세요!</h3>
          <p className="text-lg mb-6 text-blue-100">무료 체험으로 AI 얼굴 바꾸기를 경험해보세요</p>
          <button
            onClick={onBack}
            className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            지금 시작하기
          </button>
        </div>
      </div>
    </div>
  );
};