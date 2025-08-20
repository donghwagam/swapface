import React from 'react';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone } from 'lucide-react';

/**
 * 하단 푸터 컴포넌트
 */
export const Footer: React.FC = () => {
  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Youtube, href: '#', label: 'YouTube' },
  ];

  const footerLinks = [
    { label: '개인정보처리방침', href: '/privacy' },
    { label: '이용약관', href: '/terms' },
    { label: '회사소개', href: '/about' },
    { label: '공지사항', href: '/notice' },
  ];

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 회사 정보 */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-4">FaceSwap AI</h3>
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              최첨단 AI 기술로 안전하고 재미있는 얼굴 바꾸기 서비스를 제공합니다.
              개인정보는 철저히 보호되며, 업로드된 이미지는 24시간 후 자동 삭제됩니다.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:shadow-md transition-all duration-200"
                  aria-label={label}
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* 링크 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">서비스</h4>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">고객지원</h4>
            <ul className="space-y-3">
              <li className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                support@faceswap.ai
              </li>
              <li className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                1588-0000
              </li>
              <li className="text-sm text-gray-600">
                평일 09:00 - 18:00<br />
                (주말, 공휴일 제외)
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>&copy; 2025 FaceSwap AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};