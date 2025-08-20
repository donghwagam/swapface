import React from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

/**
 * 플로팅 고객지원 채팅 버튼 컴포넌트
 */
export const FloatingHelp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<string>('');

  const handleSendMessage = (): void => {
    if (message.trim()) {
      alert(`메시지가 전송되었습니다: ${message}`);
      setMessage('');
      setIsOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* 채팅 창 */}
      {isOpen && (
        <div className="mb-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-green-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">고객지원</h4>
                <p className="text-sm opacity-90">무엇을 도와드릴까요?</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4">
            <div className="mb-4 space-y-2">
              <div className="bg-gray-100 rounded-lg p-3 text-sm">
                안녕하세요! FaceSwap AI 고객지원팀입니다. 😊
              </div>
              <div className="bg-gray-100 rounded-lg p-3 text-sm">
                궁금한 점이나 문제가 있으시면 언제든 말씀해 주세요!
              </div>
            </div>
            
            <div className="flex space-x-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-blue-500 to-green-500 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 flex items-center justify-center relative"
      >
        <MessageCircle className="w-6 h-6" />
        
        {/* 알림 점 */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs text-white">1</span>
        </div>
        
        {/* 펄스 애니메이션 */}
        <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20"></div>
      </button>
    </div>
  );
};