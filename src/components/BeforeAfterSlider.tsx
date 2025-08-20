import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
}

/**
 * 전후 비교 인터랙티브 슬라이더 컴포넌트
 */
export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  className = '',
}) => {
  const [sliderPosition, setSliderPosition] = React.useState<number>(50);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = React.useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = React.useCallback(
    (e: MouseEvent | React.TouchEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      setSliderPosition(percentage);
    },
    [isDragging]
  );

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove as EventListener);
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove as EventListener);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gray-100 ${className}`}>
      <div
        ref={containerRef}
        className="relative w-full h-full cursor-col-resize select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        {/* After Image (배경) */}
        <div className="absolute inset-0">
          <img
            src={afterImage}
            alt="변환 후"
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            변환 후
          </div>
        </div>

        {/* Before Image (슬라이더로 제어) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={beforeImage}
            alt="변환 전"
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute top-4 left-4 bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-medium">
            변환 전
          </div>
        </div>

        {/* 슬라이더 라인 */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* 슬라이더 핸들 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center cursor-col-resize">
            <ChevronLeft className="w-3 h-3 text-gray-400 absolute left-2" />
            <ChevronRight className="w-3 h-3 text-gray-400 absolute right-2" />
            <div className="w-1 h-6 bg-gray-300 mx-auto"></div>
          </div>
        </div>
      </div>
      
      {/* 사용법 안내 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
        ← 드래그하여 비교 →
      </div>
    </div>
  );
};