import React, { useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

import { Titlebar } from './Titlebar';
import { Sidebar } from './Sidebar';
import { Playbar } from '../player/Playbar';
import { NowPlayingSidebar } from '../player/NowPlayingSidebar';
import { PlayerFullscreen } from '../player/PlayerFullscreen';
import { AudioProvider } from '../player/AudioProvider';

import { useUIStore } from '../../store/useUIStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { SearchBar } from './SearchBar';

const borderColor = "#2D2D2D";

export const RootLayout: React.FC = () => {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const isSidebarPinned = useUIStore((state) => state.isSidebarPinned);
  const setIsSidebarOpen = useUIStore((state) => state.setIsSidebarOpen);
  const toggleSidebarPin = useUIStore((state) => state.toggleSidebarPin);
  
  const isNowPlayingOpen = useUIStore((state) => state.isNowPlayingOpen);
  const setIsNowPlayingOpen = useUIStore((state) => state.setIsNowPlayingOpen);
  const isFullscreenOpen = useUIStore((state) => state.isFullscreenOpen);
  const setIsFullscreenOpen = useUIStore((state) => state.setIsFullscreenOpen);
  
  const setIsSearchActive = useUIStore((state) => state.setIsSearchActive);
  const isTitlebarHovered = useUIStore((state) => state.isTitlebarHovered);

  // Player Store
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const volume = usePlayerStore((state) => state.volume);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const isShuffleOn = usePlayerStore((state) => state.isShuffleOn);
  
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const setRepeatMode = usePlayerStore((state) => state.setRepeatMode);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);

  const navigate = useNavigate();
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Smooth Scrolling
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const contentElement = scrollContainerRef.current.firstElementChild as HTMLElement || scrollContainerRef.current;
    const lenis = new Lenis({
      wrapper: scrollContainerRef.current,
      content: contentElement,
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    const resizeObserver = new ResizeObserver(() => lenis.resize());
    resizeObserver.observe(contentElement);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const [searchQuery, setSearchQuery] = React.useState("");

  return (
    <main
      className="w-screen h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundColor: borderColor,
        padding: "6px",
        paddingTop: isTitlebarHovered ? "44px" : "6px",
        transition: "padding-top 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      <style>{`
        * {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        ::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <Titlebar />
      <AudioProvider />

      <div
        className="flex-1 rounded-2xl relative flex flex-col overflow-hidden w-full h-full shadow-inner"
        style={{ backgroundColor: "#070707" }}
      >
        <div className={`absolute top-6 left-6 z-40 select-none pointer-events-none ${isFullscreenOpen ? 'opacity-0' : 'opacity-100'}`}>
          <img src="/SerenLogo.png" className="h-13 w-auto object-contain" alt="Serene Logo" />
        </div>

        <div 
          className="absolute top-0 left-0 w-8 h-full z-45 cursor-none"
          onMouseEnter={() => setIsSidebarOpen(true)}
        />

        <Sidebar
          isOpen={!isFullscreenOpen && (isSidebarOpen || isSidebarPinned)}
          onClose={() => { if (!isSidebarPinned) setIsSidebarOpen(false); }}
          activeNav={location.pathname === '/' ? 'home' : location.pathname.split('/')[1]}
          setActiveNav={(id: any) => navigate(`/${id === 'home' ? '' : id}`)}
          isPinned={isSidebarPinned}
          onTogglePin={toggleSidebarPin}
        />

        <div className={`flex-1 flex overflow-hidden relative z-20 ${isFullscreenOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {(location.pathname.startsWith('/artist/') || location.pathname.startsWith('/album/')) && (
            <div 
              className="absolute inset-0 pointer-events-none z-0" 
              style={{ 
                background: "rgba(6, 6, 6, 0.16)", 
                backdropFilter: "blur(32px)", 
                WebkitBackdropFilter: "blur(32px)", 
              }} 
            />
          )}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto pl-[110px] pb-40 select-none relative z-10"
            style={{ 
              marginRight: isNowPlayingOpen ? "400px" : "0px",
              paddingRight: "32px",
              transition: "margin-right 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div className="flex flex-col gap-10 w-full min-h-full">
              <div className="flex items-center justify-end pt-[29px] sticky top-0 z-40 bg-transparent px-4">
                <div className="flex items-center space-x-4 pr-4">
                  <div className="flex items-center space-x-2 mr-2">
                    <button 
                      onClick={() => navigate(-1)} 
                      className="w-[42px] h-[42px] flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/5 text-white/50 hover:text-[#F26B50] hover:bg-black/60 hover:border-[#F26B50]/30 transition-all shadow-lg"
                      title="Go Back"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => navigate(1)} 
                      className="w-[42px] h-[42px] flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/5 text-white/50 hover:text-[#F26B50] hover:bg-black/60 hover:border-[#F26B50]/30 transition-all shadow-lg"
                      title="Go Forward"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <SearchBar 
                    query={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={(q) => {
                      setIsSearchActive(true);
                      navigate(`/search?q=${encodeURIComponent(q || "")}`);
                    }}
                  />
                </div>
              </div>

              {/* Page Content Rendered Here */}
              <Outlet />
            </div>
          </div>

          <NowPlayingSidebar 
            isOpen={isNowPlayingOpen}
            onClose={() => setIsNowPlayingOpen(false)}
            track={currentTrack}
            isPlaying={isPlaying}
            onPlayToggle={() => setIsPlaying(!isPlaying)}
            currentTime={currentTime}
            duration={duration}
            onSeek={setCurrentTime}
            volume={volume}
            onVolumeChange={setVolume}
            allTracks={usePlayerStore.getState().queue}
            onTrackSelect={(track) => {
              usePlayerStore.getState().setCurrentTrack(track);
              usePlayerStore.getState().setIsPlaying(true);
            }}
            onArtistSelect={(id) => navigate(`/artist/${id}`)}
            repeatMode={repeatMode}
            onRepeatToggle={() => {
              const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'track' : 'off';
              setRepeatMode(nextMode);
            }}
            onNext={playNext}
            onPrevious={playPrevious}
            onFullscreenToggle={() => setIsFullscreenOpen(!isFullscreenOpen)}
            isShuffleOn={isShuffleOn}
            onToggleShuffle={toggleShuffle}
          />
        </div>

        <Playbar 
          track={isFullscreenOpen ? null : currentTrack}
          isPlaying={isPlaying}
          onPlayToggle={() => setIsPlaying(!isPlaying)}
          currentTime={currentTime}
          duration={duration}
          onSeek={setCurrentTime}
          volume={volume}
          onVolumeChange={setVolume}
          isNowPlayingOpen={isNowPlayingOpen}
          onNowPlayingToggle={() => setIsNowPlayingOpen(!isNowPlayingOpen)}
          repeatMode={repeatMode}
          onRepeatToggle={() => {
            const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'track' : 'off';
            setRepeatMode(nextMode);
          }}
          onNext={playNext}
          onPrevious={playPrevious}
          isArtistPage={false}
          isShuffleOn={isShuffleOn}
          onToggleShuffle={toggleShuffle}
          onArtistClick={(id) => navigate(`/artist/${id}`)}
        />

        <PlayerFullscreen 
          isOpen={isFullscreenOpen}
          onClose={() => setIsFullscreenOpen(false)}
          track={currentTrack}
          isPlaying={isPlaying}
          onPlayToggle={() => setIsPlaying(!isPlaying)}
          currentTime={currentTime}
          duration={duration}
          onSeek={setCurrentTime}
          volume={volume}
          onVolumeChange={setVolume}
          repeatMode={repeatMode}
          onRepeatToggle={() => {
             const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'track' : 'off';
             setRepeatMode(nextMode);
          }}
          onNext={playNext}
          onPrevious={playPrevious}
          isShuffleOn={isShuffleOn}
          onToggleShuffle={toggleShuffle}
        />

        {/* Background Waves */}
        <svg
          className="absolute inset-0 w-full h-full z-10"
          viewBox="0 0 1440 810"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ pointerEvents: "none" }}
        >
          <rect width="1440" height="810" fill="#070707" />
          {/* LEFT SIDE */}
          <path d="M -50 860 L -580 860 C -380 500, -100 350, 420 -50 L -50 -50 Z" fill="#3a3a3a" />
          <path d="M -50 860 L -410 860 C -150 780, 220 280, 510 -50 L -50 -50 Z" fill="#2c2c2c" />
          <path d="M -50 860 L -250 860 C 50 640, 120 180, 680 -50 L -50 -50 Z" fill="#1e1e1e" />
          <path d="M -50 860 L -80 860 C 320 520, 450 380, 890 -50 L -50 -50 Z" fill="#141414" />
          <path d="M -50 860 L 150 860 C 480 620, 720 200, 1040 -50 L -50 -50 Z" fill="#0c0c0c" />
          {/* RIGHT SIDE */}
          <path d="M 50 860 C 350 720, 480 250, 820 -50 L 1490 -50 L 1490 860 Z" fill="#3d0f06" />
          <path d="M 280 860 C 180 580, 820 420, 990 -50 L 1490 -50 L 1490 860 Z" fill="#7a1f0d" />
          <path d="M 390 860 C 620 530, 780 180, 1180 -50 L 1490 -50 L 1490 860 Z" fill="#a8311b" />
          <path d="M 450 860 C 760 510, 1050 120, 1490 -50 L 1490 860 Z" fill="#d94b30" />
          <path d="M 600 860 C 950 480, 1250 150, 1490 -50 L 1490 860 Z" fill="#F26B50" />
        </svg>
      </div>
    </main>
  );
};
