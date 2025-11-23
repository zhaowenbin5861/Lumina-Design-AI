import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

interface CompareSliderProps {
  original: string;
  modified: string;
  className?: string;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({ original, modified, className = '' }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = (x / rect.width) * 100;
      setSliderPosition(percent);
    }
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleTouchStart = () => setIsDragging(true);

  const handleMouseUp = () => setIsDragging(false);
  const handleTouchEnd = () => setIsDragging(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) handleMove(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMove]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none group cursor-col-resize ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Modified Image (Background/Underneath) */}
      <img
        src={modified}
        alt="Modified Design"
        className="absolute top-0 left-0 w-full h-full object-cover"
      />

      {/* Original Image (Foreground/Clipped) */}
      <div
        className="absolute top-0 left-0 w-full h-full overflow-hidden will-change-[width]"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={original}
          alt="Original Room"
          className="absolute top-0 left-0 max-w-none h-full object-cover"
          // Important: We need to set width to the container's width to match aspect ratio
          // However, since container is responsive, we use 100vw/100vh or better: JS calculated width.
          // CSS object-cover usually handles this if the img tag is sized to the container.
          // The issue: inside the clipped div, the image needs to be the full width of the PARENT, not the clipped div.
          // Solution: standard technique is setting width to container width via style if possible, or using 100vw if full screen.
          // Here, we rely on the parent container dimensions.
          style={{ width: containerRef.current?.offsetWidth || '100%' }}
        />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-col-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 flex items-center justify-center"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center -ml-3.5 text-slate-800">
          <ChevronsLeftRight size={18} />
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
        Original
      </div>
      <div className="absolute top-4 right-4 bg-indigo-600/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
        Reimagined
      </div>
    </div>
  );
};
