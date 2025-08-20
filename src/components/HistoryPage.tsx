import React from 'react';
import { Download, Trash2, Calendar, Clock } from 'lucide-react';
import type { SwapHistory, User } from '../types';

interface HistoryPageProps {
  user: User;
  history: SwapHistory[];
  onBack: () => void;
}

/**
 * 얼굴 바꾸기 히스토리 페이지 컴포넌트
 */
export const HistoryPage: React.FC<HistoryPageProps> = ({ user, history, onBack }) => {
  const handleDownload = (item: SwapHistory): void => {
    const link = document.createElement('a');
    link.href = item.swappedImage;
    link.download = `face-swap-${item.id}.jpg`;
    link.click();
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">작업 히스토리</h1>
          <p className="text-xl text-gray-600">지금까지 생성한 AI 얼굴 바꾸기 결과를 확인하세요</p>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{history.length}</div>
            <div className="text-gray-600">총 생성 횟수</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {history.reduce((sum, item) => sum + item.creditsUsed, 0)}
            </div>
            <div className="text-gray-600">사용한 크레딧</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{user.credits}</div>
            <div className="text-gray-600">보유 크레딧</div>
          </div>
        </div>

        {/* 히스토리 리스트 */}
        {history.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">아직 생성한 이미지가 없어요</h3>
            <p className="text-gray-600 mb-6">첫 번째 AI 얼굴 바꾸기를 시작해 보세요!</p>
            <button
              onClick={onBack}
              className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              지금 시작하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-200 hover:scale-105">
                {/* 이미지 미리보기 */}
                <div className="relative">
                  <div className="grid grid-cols-2">
                    <div className="relative">
                      <img
                        src={item.originalImage}
                        alt="원본 이미지"
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        원본
                      </div>
                    </div>
                    <div className="relative">
                      <img
                        src={item.swappedImage}
                        alt="변환된 이미지"
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                        결과
                      </div>
                    </div>
                  </div>
                </div>

                {/* 정보 */}
                <div className="p-6">
                  <div className="flex items-center text-sm text-gray-600 mb-3">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{formatDate(item.timestamp)}</span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">
                      {item.creditsUsed > 0 ? `${item.creditsUsed} 크레딧 사용` : '무료 체험'}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      ID: {item.id}
                    </span>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownload(item)}
                      className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Download className="w-4 h-4" />
                      <span>다운로드</span>
                    </button>
                    <button className="px-4 py-2 text-gray-500 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};