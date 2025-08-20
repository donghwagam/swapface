import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FloatingHelp } from './components/FloatingHelp';
import { SwapModeSelector } from './components/SwapModeSelector';
import { HeroSection } from './components/HeroSection';
import { SingleFaceSwap } from './components/SingleFaceSwap';
import { MultiFaceSwap } from './components/MultiFaceSwap';
import { VideoFaceSwap } from './components/VideoFaceSwap';
import { CreditSystem } from './components/CreditSystem';
import { HistoryPage } from './components/HistoryPage';
import { GuidePage } from './components/GuidePage';
import { FaqPage } from './components/FaqPage';
import { useUser } from './hooks/useUser';
import type { SwapResult, SwapMode, MultiFaceSwapResult, VideoSwapResult } from './types';

type AppView = 'home' | 'mode-select' | 'single' | 'multi' | 'video' | 'credits' | 'history' | 'guide' | 'faq';

/**
 * 메인 애플리케이션 컴포넌트
 */
function App() {
  const [currentView, setCurrentView] = React.useState<AppView>('home');
  const { user, history, deductCredit, addCredits, addToHistory, canPerformSwap, getSwapCost } = useUser();

  const handleModeSelect = (): void => {
    setCurrentView('mode-select');
  };

  const handleSwapComplete = (result: SwapResult): void => {
    addToHistory({
      originalImage: result.originalImage,
      swappedImage: result.swappedImage,
      creditsUsed: result.creditsUsed,
    });
  };

  const handleMultiFaceSwapComplete = (result: MultiFaceSwapResult): void => {
    addToHistory({
      originalImage: result.originalImage,
      swappedImage: result.swappedImage,
      creditsUsed: result.creditsUsed,
    });
  };

  const handleVideoSwapComplete = (result: VideoSwapResult): void => {
    addToHistory({
      originalImage: result.originalVideo,
      swappedImage: result.swappedVideo,
      creditsUsed: result.creditsUsed,
    });
  };

  const handleSwapModeSelect = (mode: SwapMode): void => {
    setCurrentView(mode);
  };

  const handleBackToHome = (): void => {
    setCurrentView('home');
  };

  const handleCreditClick = (): void => {
    setCurrentView('credits');
  };

  const handlePurchase = (credits: number): void => {
    addCredits(credits);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'mode-select':
        return (
          <SwapModeSelector onModeSelect={handleSwapModeSelect} />
        );
      case 'single':
        return (
          <SingleFaceSwap
            user={user}
            onBack={handleBackToHome}
            onSwapComplete={handleSwapComplete}
            onCreditDeduct={deductCredit}
          />
        );
      case 'multi':
        return (
          <MultiFaceSwap
            user={user}
            onBack={handleBackToHome}
            onSwapComplete={handleMultiFaceSwapComplete}
            onCreditDeduct={deductCredit}
          />
        );
      case 'video':
        return (
          <VideoFaceSwap
            user={user}
            onBack={handleBackToHome}
            onSwapComplete={handleVideoSwapComplete}
            onCreditDeduct={deductCredit}
          />
        );
      case 'credits':
        return (
          <CreditSystem
            user={user}
            onBack={handleBackToHome}
            onPurchase={handlePurchase}
          />
        );
      case 'history':
        return (
          <HistoryPage
            user={user}
            history={history}
            onBack={handleBackToHome}
          />
        );
      case 'guide':
        return (
          <GuidePage
            onBack={handleBackToHome}
          />
        );
      case 'faq':
        return (
          <FaqPage
            onBack={handleBackToHome}
          />
        );
      default:
        return (
          <main>
            <HeroSection onModeSelect={handleModeSelect} />
            <SwapModeSelector onModeSelect={handleSwapModeSelect} />
            
            {/* 추가 섹션들 */}
            <section className="py-20 bg-white">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">FaceSwap AI의 특별한 기능들</h2>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="p-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🚀</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">다양한 모드</h3>
                    <p className="text-gray-600">단일, 다중, 비디오 얼굴 바꾸기까지 모든 상황에 대응</p>
                  </div>
                  <div className="p-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">초고속 처리</h3>
                    <p className="text-gray-600">최신 AI 기술로 빠르고 자연스러운 결과 생성</p>
                  </div>
                  <div className="p-6">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">✨</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">프리미엄 품질</h3>
                    <p className="text-gray-600">전문가 수준의 고품질 결과물과 안전한 개인정보 보호</p>
                  </div>
                </div>
              </div>
            </section>
          </main>
        );
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-white flex flex-col">
        <Header 
          user={user} 
          onCreditClick={handleCreditClick}
          onHomeClick={handleBackToHome}
        />
        
        <div className="flex-1">
          <Routes>
            <Route path="/" element={renderCurrentView()} />
            <Route path="/guide" element={
              <GuidePage
                onBack={handleBackToHome}
              />
            } />
            <Route path="/history" element={
              <HistoryPage
                user={user}
                history={history}
                onBack={handleBackToHome}
              />
            } />
            <Route path="/faq" element={
              <FaqPage
                onBack={handleBackToHome}
              />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {currentView === 'home' && <Footer />}
        <FloatingHelp />
      </div>
    </Router>
  );
}

export default App;