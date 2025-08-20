import React from 'react';
import { Key, ExternalLink, AlertCircle } from 'lucide-react';

export const ApiKeySetup: React.FC = () => {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-800 mb-3">
            Replicate API 키 설정이 필요합니다
          </h3>
          <div className="space-y-3 text-sm text-amber-700">
            <div>실제 얼굴 바꾸기 기능을 사용하려면 Replicate API 키가 필요합니다:</div>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                <a 
                  href="https://replicate.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline inline-flex items-center"
                >
                  Replicate.com <ExternalLink className="w-3 h-3 ml-1" />
                </a>
                에서 계정을 생성하세요
              </li>
              <li>Account Settings → API tokens에서 새 토큰을 생성하세요</li>
              <li>프로젝트 루트에 있는 .env 파일을 열어서 토큰을 설정하세요:</li>
            </ol>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs">
              VITE_REPLICATE_API_TOKEN=r8_your_token_here...
            </div>
            <div className="flex items-center space-x-1">
              <Key className="w-4 h-4" />
              <span>개발 서버를 재시작한 후 다시 시도해보세요</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};