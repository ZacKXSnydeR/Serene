import React, { useEffect, useState } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { useUIStore } from '../../store/useUIStore';

const appWindow = getCurrentWindow();

export const Titlebar: React.FC = () => {
  const isTitlebarHovered = useUIStore((state) => state.isTitlebarHovered);
  const setIsTitlebarHovered = useUIStore((state) => state.setIsTitlebarHovered);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized).catch(() => {});

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (e.buttons !== 1) {
        setIsDragging(false);
        if (e.clientY > 44) {
          setIsTitlebarHovered(false);
        }
      }
      if (e.clientY < 8) {
        setIsTitlebarHovered(true);
      }
    };

    let resizeTimer: number;
    const enforceAspectRatio = async () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(async () => {
        try {
          const isMax = await appWindow.isMaximized();
          if (isMax) return; 

          const size = await appWindow.outerSize();
          const targetRatio = 16 / 9;
          const currentRatio = size.width / size.height;

          if (Math.abs(currentRatio - targetRatio) > 0.01) {
            const newHeight = Math.round(size.width / targetRatio);
            await appWindow.setSize(new LogicalSize(size.width, newHeight));
          }
        } catch (e) {}
      }, 300);
    };

    let unlistenResize: () => void;
    appWindow.onResized(() => {
      enforceAspectRatio();
    }).then(unlisten => {
      unlistenResize = unlisten;
    });

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      if (unlistenResize) unlistenResize();
    };
  }, []);

  const handleMaximize = async () => {
    try {
      if (isMaximized) {
        await appWindow.unmaximize();
        setIsMaximized(false);
      } else {
        await appWindow.maximize();
        setIsMaximized(true);
      }
    } catch (e) {
      console.error("Maximize failed:", e);
    }
  };

  return (
    <div
      className={`absolute top-0 left-0 right-0 h-[44px] flex items-center justify-between pl-5 pr-3 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isTitlebarHovered ? 'translate-y-0' : '-translate-y-full'}`}
      data-tauri-drag-region
      onMouseEnter={() => setIsTitlebarHovered(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsTitlebarHovered(false);
      }}
      onMouseDown={(e) => {
        if (e.button === 0) setIsDragging(true);
      }}
      onDoubleClick={handleMaximize}
    >
      <div
        className="flex-1 h-full flex items-center cursor-default"
        data-tauri-drag-region
        onDoubleClick={handleMaximize}
      >
        <span 
          className="text-[11px] text-white/50 font-medium tracking-[0.45em] select-none pointer-events-none mt-[2px] uppercase"
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          SERENE
        </span>
      </div>

      <div className="flex items-center space-x-1 z-50">
        <button
          onClick={() => appWindow.minimize()}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] text-white/30 hover:text-white/90 hover:bg-white/10 transition-all duration-200"
        >
          <svg className="pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="2" y1="6" x2="10" y2="6" />
          </svg>
        </button>

        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] text-white/30 hover:text-white/90 hover:bg-white/10 transition-all duration-200"
        >
          {isMaximized ? (
            <svg className="pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M3 5v4a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1z" />
              <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H9" />
            </svg>
          ) : (
            <svg className="pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <rect x="2" y="2" width="8" height="8" rx="1.5" />
            </svg>
          )}
        </button>

        <button
          onClick={() => appWindow.close()}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] text-white/30 hover:text-white hover:bg-[#E81123] transition-all duration-200"
        >
          <svg className="pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="3" x2="9" y2="9" />
            <line x1="3" y1="9" x2="9" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
};
