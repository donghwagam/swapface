import React from 'react';
import { CreditCard, Check, Star, ArrowLeft } from 'lucide-react';
import { CREDIT_PACKAGES } from '../utils/constants';
import type { User } from '../types';

interface CreditSystemProps {
  user: User;
  onBack: () => void;
  onPurchase: (credits: number) => void;
}

/**
 * 크레딧 시스템 및 결제 페이지 컴포넌트
 */
export const CreditSystem: React.FC<CreditSystemProps> = ({ user, onBack, onPurchase }) => {
  const [selectedPackage, setSelectedPackage] = React.useState<string>('popular');

  const handlePurchase = (credits: number): void => {
    // 실제 결제 처리 로직
    if (confirm(`${credits} 크레딧을 구매하시겠습니까?`)) {
      onPurchase(credits);
      alert('크레딧이 성공적으로 충전되었습니다!');
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* 뒤로가기 버튼 */}
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-8 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>홈으로 돌아가기</span>
        </button>

        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">크레딧 충전</h1>
          <p className="text-xl text-gray-600 mb-6">더 많은 AI 얼굴 바꾸기를 위해 크레딧을 충전하세요</p>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto">
            <div className="text-center">
              <p className="text-gray-600 mb-2">현재 보유 크레딧</p>
              <div className="text-4xl font-bold text-blue-600 mb-2">{user.credits}</div>
              {user.freeTrialsUsed < user.maxFreeTrials && (
                <p className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full inline-block">
                  무료 체험 {user.maxFreeTrials - user.freeTrialsUsed}회 남음
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 크레딧 패키지 */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-white rounded-2xl shadow-xl p-8 transition-all duration-200 cursor-pointer ${
                selectedPackage === pkg.id
                  ? 'ring-4 ring-blue-500 scale-105'
                  : 'hover:shadow-2xl hover:scale-105'
              } ${pkg.isPopular ? 'border-2 border-blue-500' : ''}`}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              {/* 인기 배지 */}
              {pkg.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center space-x-1">
                    {pkg.isPopular && <Star className="w-4 h-4" />}
                    <span>{pkg.badge}</span>
                  </div>
                </div>
              )}

              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900 mb-2">{pkg.credits}</div>
                <div className="text-gray-600 mb-4">크레딧</div>
                
                <div className="mb-6">
                  <div className="text-3xl font-bold text-blue-600">
                    {pkg.price.toLocaleString()}원
                  </div>
                  {pkg.originalPrice && (
                    <div className="text-lg text-gray-400 line-through">
                      {pkg.originalPrice.toLocaleString()}원
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-600 mb-6">
                  <p>크레딧당 {Math.round(pkg.price / pkg.credits)}원</p>
                  {pkg.originalPrice && (
                    <p className="text-green-600 font-medium">
                      {Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)}% 할인!
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handlePurchase(pkg.credits)}
                  className={`w-full py-3 px-6 rounded-full font-semibold transition-all duration-200 ${
                    selectedPackage === pkg.id
                      ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white hover:shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  선택하기
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 결제 방법 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">결제 방법</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="flex items-center p-4 border-2 border-blue-500 rounded-xl bg-blue-50">
              <input type="radio" name="payment" value="toss" defaultChecked className="mr-3" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">토스페이</div>
                <div className="text-sm text-gray-600">간편하고 안전한 결제</div>
              </div>
              <div className="w-12 h-8 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">
                TOSS
              </div>
            </div>

            <div className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-yellow-400 cursor-pointer">
              <input type="radio" name="payment" value="kakao" className="mr-3" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">카카오페이</div>
                <div className="text-sm text-gray-600">카카오톡으로 간편결제</div>
              </div>
              <div className="w-12 h-8 bg-yellow-400 rounded text-black text-xs flex items-center justify-center font-bold">
                PAY
              </div>
            </div>
          </div>

          {/* 혜택 안내 */}
          <div className="bg-green-50 rounded-xl p-6 mb-6">
            <h4 className="font-semibold text-green-800 mb-3">💎 충전 혜택</h4>
            <ul className="space-y-2 text-sm text-green-700">
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2" />
                구매한 크레딧은 무기한 사용 가능
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2" />
                친구 추천시 5 크레딧 추가 지급
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2" />
                더 많은 패키지일수록 할인율 증가
              </li>
            </ul>
          </div>

          {/* 이용약관 */}
          <div className="text-xs text-gray-500 text-center">
            <p>
              결제 진행 시{' '}
              <a href="/terms" className="text-blue-600 hover:underline">이용약관</a>
              {' '}및{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">개인정보처리방침</a>
              에 동의한 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};