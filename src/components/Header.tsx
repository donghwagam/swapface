import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sparkles, CreditCard } from 'lucide-react';
import type { User } from '../types';

interface HeaderProps {
  user: User;
  onCreditClick: () => void;
  onHomeClick?: () => void;
}

/**
 * 상단 네비게이션 헤더 컴포넌트
 */
export const Header: React.FC<HeaderProps> = ({ user, onCreditClick, onHomeClick }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogoClick = () => {
    if (onHomeClick) {
      onHomeClick();
    } else {
      navigate('/');
    }
  };

  const menuItems = [
    { label: '홈', href: '/' },
    { label: '사용법', href: '/guide' },
    { label: '히스토리', href: '/history' },
    { label: 'FAQ', href: '/faq' },
  ];

  const isActivePage = (href: string): boolean => location.pathname === href;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <button 
            onClick={handleLogoClick}
            className="flex items-center space-x-2 font-bold text-xl text-gray-900 hover:text-blue-600 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span>FaceSwap AI</span>
          </button>

          {/* 데스크탑 네비게이션 */}
          <nav className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  isActivePage(item.href) ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* 크레딧 표시 & 충전 버튼 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-50 rounded-full px-4 py-2">
              <CreditCard className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                {user.credits} 크레딧
              </span>
              {user.freeTrialsUsed < user.maxFreeTrials && (
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  무료 {user.maxFreeTrials - user.freeTrialsUsed}회
                </span>
              )}
            </div>
            
            <button
              onClick={onCreditClick}
              className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              충전하기
            </button>

            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4">
            <nav className="flex flex-col space-y-3">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-gray-50 ${
                    isActivePage(item.href) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};