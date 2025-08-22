import React from 'react';
import { Key, ExternalLink, AlertCircle } from 'lucide-react';

interface ApiKeySetupProps {
  apiProvider?: 'replicate' | 'aifaceswap';
}

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ apiProvider = 'aifaceswap' }) => {
  const getApiConfig = () => {
    if (apiProvider === 'replicate') {
      return {
        title: 'Replicate API 키 설정이 필요합니다',
        url: 'https://replicate.com',
        urlText: 'Replicate.com',
        steps: [
          'Account Settings → API tokens에서 새 토큰을 생성하세요',
          '프로젝트 루트에 있는 .env 파일을 열어서 토큰을 설정하세요:'
        ],
        envVar: 'VITE_REPLICATE_API_TOKEN=r8_your_token_here...'
      };
    } else {
      return {
        title: 'AIFaceSwap.io API 키 설정이 필요합니다',
        url: 'https://aifaceswap.io',
        urlText: 'AIFaceSwap.io',
        steps: [
          'API Management Page에서 API 키를 확인하세요',
          '프로젝트 루트에 있는 .env 파일을 열어서 키를 설정하세요:'
        ],
        envVar: 'VITE_AIFACESWAP_API_KEY=your_api_key_here'
      };
    }
  };

  const config = getApiConfig();

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-800 mb-3">
            {config.title}
          </h3>
          <div className="space-y-3 text-sm text-amber-700">
            <div>실제 얼굴 바꾸기 기능을 사용하려면 API 키가 필요합니다:</div>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                <a 
                  href={config.url}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline inline-flex items-center"
                >
                  {config.urlText} <ExternalLink className="w-3 h-3 ml-1" />
                </a>
                에서 계정을 생성하세요
              </li>
              {config.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs">
              {config.envVar}
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