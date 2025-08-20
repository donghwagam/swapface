import React from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FaqPageProps {
  onBack: () => void;
}

export const FaqPage: React.FC<FaqPageProps> = ({ onBack }) => {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const faqs = [
    {
      question: 'FaceSwap AI는 무료로 사용할 수 있나요?',
      answer: '네! 가입 시 2회의 무료 체험을 제공합니다. 무료 체험 후에는 크레딧을 구매하여 계속 사용하실 수 있습니다.'
    },
    {
      question: '어떤 이미지 형식을 지원하나요?',
      answer: 'JPG, PNG 형식의 이미지를 지원합니다. 최대 파일 크기는 10MB이며, 얼굴이 선명하게 보이는 고품질 이미지를 권장합니다.'
    },
    {
      question: '처리 시간은 얼마나 걸리나요?',
      answer: '단일 얼굴 바꾸기는 평균 30초, 다중 얼굴 바꾸기는 1-2분, 비디오 얼굴 바꾸기는 2-5분 정도 소요됩니다.'
    },
    {
      question: '크레딧은 어떻게 사용되나요?',
      answer: '단일 얼굴 바꾸기 1크레딧, 다중 얼굴 바꾸기 3크레딧, 비디오 얼굴 바꾸기 5크레딧이 소모됩니다. 크레딧은 영구 사용 가능합니다.'
    },
    {
      question: '생성된 이미지의 저작권은 누구에게 있나요?',
      answer: '생성된 이미지의 저작권은 사용자에게 있습니다. 다만, 타인의 초상권을 침해하지 않도록 주의해 주세요.'
    },
    {
      question: '개인정보는 안전하게 보호되나요?',
      answer: '업로드된 이미지는 처리 후 24시간 내에 자동으로 삭제되며, 개인정보 보호를 위한 최고 수준의 보안을 적용합니다.'
    },
    {
      question: '비디오 얼굴 바꾸기의 제한사항이 있나요?',
      answer: '최대 30초, 100MB 크기의 MP4 파일을 지원합니다. HD 품질로 처리되며, 프레임별 최적화를 통해 자연스러운 결과를 제공합니다.'
    },
    {
      question: '결과가 만족스럽지 않으면 어떻게 하나요?',
      answer: '이미지 품질이나 기술적 오류로 인해 결과가 불만족스러운 경우, 고객센터를 통해 크레딧 환불을 요청하실 수 있습니다.'
    },
    {
      question: '상업적 용도로 사용할 수 있나요?',
      answer: '개인적 용도와 상업적 용도 모두 가능합니다. 다만, 타인의 초상권과 관련 법규를 준수해 주시기 바랍니다.'
    },
    {
      question: '모바일에서도 사용할 수 있나요?',
      answer: '네! 웹 브라우저를 통해 모바일, 태블릿, 데스크톱 모든 기기에서 사용 가능합니다.'
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        <div className="text-center mb-16">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">자주 묻는 질문</h1>
          <p className="text-xl text-gray-600">FaceSwap AI 사용에 대한 궁금한 점들을 확인해보세요</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 pr-4">{faq.question}</h3>
                {openFaq === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openFaq === index && (
                <div className="px-8 pb-6">
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">더 궁금한 점이 있으신가요?</h3>
          <p className="text-lg mb-6 text-blue-100">언제든지 고객센터로 문의해 주세요</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105">
              이메일 문의
            </button>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors">
              카카오톡 상담
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};