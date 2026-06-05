import { useState } from "react";
import "./playbar.css";

interface PlaybarProps {
  track: any;
  isPlaying: boolean;
  onPlayToggle: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isNowPlayingOpen: boolean;
  onNowPlayingToggle: () => void;
  repeatMode: "off" | "all" | "track";
  onRepeatToggle: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  isArtistPage?: boolean;
  isShuffleOn?: boolean;
  onToggleShuffle?: () => void;
  onArtistClick?: (id: string) => void;
}

export function Playbar({
  track,
  isPlaying,
  onPlayToggle,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isNowPlayingOpen,
  onNowPlayingToggle,
  repeatMode,
  onRepeatToggle,
  onNext,
  onPrevious,
  isArtistPage,
  isShuffleOn,
  onToggleShuffle,
  onArtistClick
}: PlaybarProps) {
  const [isLiked, setIsLiked] = useState(false);

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Slidable/Draggable mouse handler for time seek bar
  const handleTimeDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!track || duration === 0) return;
    const scrubber = e.currentTarget;
    
    const updateTime = (clientX: number) => {
      const rect = scrubber.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      onSeek(pct * duration);
    };

    updateTime(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateTime(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Slidable/Draggable mouse handler for volume bar
  const handleVolumeDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    const slider = e.currentTarget;
    
    const updateVolume = (clientX: number) => {
      const rect = slider.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      onVolumeChange(Math.round(pct * 100));
    };

    updateVolume(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateVolume(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const isVisible = !!track;

  if (isArtistPage && isVisible) {
    return (
      <div 
        className={`fixed bottom-8 right-8 w-16 h-16 hover:h-[136px] rounded-full overflow-hidden shadow-2xl z-[100] transition-all duration-300 border-2 border-white/20 bg-black/70 backdrop-blur-xl group ${isNowPlayingOpen ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
        <div className="relative w-full h-full">
          {/* Sidebar Toggle Button (Top) */}
          <button 
            onClick={(e) => { e.stopPropagation(); onNowPlayingToggle(); }}
            className="absolute top-1 right-0 w-16 h-14 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white/70 hover:text-white cursor-pointer"
            title="Now Playing Sidebar"
          >
            <svg className="translate-x-[2px]" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>

          {/* Vinyl Disk / Play Button (Bottom) */}
          <div 
            className="absolute bottom-0 left-0 w-full h-16 cursor-pointer rounded-full overflow-hidden"
            onClick={onPlayToggle}
            title={isPlaying ? "Pause" : "Play"}
          >
            <img 
                src={track.poster} 
                alt={track.title} 
                className="w-full h-full object-cover rounded-full"
                style={{ 
                  animation: 'spinVinyl 4s linear infinite',
                  animationPlayState: isPlaying ? 'running' : 'paused' 
                }}
            />
            {/* Inner vinyl hole */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-black rounded-full border border-white/30" />
            
            {/* Play/Pause overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                {isPlaying ? (
                  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                    <path d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" />
                  </svg>
                ) : (
                  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                    <path d="M8 5.25v13.5a.75.75 0 0 0 1.152.628l11.25-6.75a.75.75 0 0 0 0-1.256L9.152 4.622A.75.75 0 0 0 8 5.25Z" />
                  </svg>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`playbar-container ${isVisible ? 'playbar-visible' : ''} ${isNowPlayingOpen ? 'playbar-shifted' : ''}`}>
      {/* 1. Track Info (Left) */}
      <div className="playbar-left">
        {track ? (
          <>
            <div className="playbar-track-cover-wrapper">
              <img 
                src={track.poster} 
                alt={track.title} 
                className="playbar-track-cover"
              />
            </div>
            <div className="playbar-track-info">
              <p className="playbar-track-title" title={track.title}>{track.title}</p>
              <p 
                className={`playbar-track-artist ${track.artistId ? 'hover:underline cursor-pointer transition-all hover:text-white' : ''}`} 
                title={track.artist}
                onClick={(e) => {
                  e.stopPropagation();
                  if (track.artistId && onArtistClick) {
                    onArtistClick(track.artistId);
                  }
                }}
              >
                {track.artist}
              </p>
            </div>
            <button 
              className={`playbar-like-btn ${isLiked ? "playbar-like-btn-active" : ""}`}
              onClick={() => setIsLiked(!isLiked)}
              title={isLiked ? "Remove from Library" : "Save to Library"}
            >
              <svg className="w-[18px] h-[18px]" fill={isLiked ? "#F26B50" : "none"} stroke={isLiked ? "#F26B50" : "currentColor"} strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </>
        ) : (
          <div className="playbar-no-track">
            <span className="text-xs text-white/20 font-medium">Select a song to play</span>
          </div>
        )}
      </div>

      {/* 2. Playback Controls & Timeline (Center) */}
      <div className="playbar-center">
        {/* Playback buttons */}
        <div className="playbar-controls">
          <button 
            className={`playbar-control-btn ${isShuffleOn ? 'playbar-shuffle-active' : ''}`} 
            title="Shuffle" 
            disabled={!track}
            onClick={onToggleShuffle}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>
          
          <button className="playbar-control-btn" title="Previous" disabled={!track} onClick={onPrevious}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button 
            className="playbar-play-pause-btn" 
            onClick={onPlayToggle}
            disabled={!track}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" className="text-black mr-[1px]">
                <path d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" />
              </svg>
            ) : (
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" className="text-black mr-[1px]">
                <path d="M8 5.25v13.5a.75.75 0 0 0 1.152.628l11.25-6.75a.75.75 0 0 0 0-1.256L9.152 4.622A.75.75 0 0 0 8 5.25Z" />
              </svg>
            )}
          </button>

          <button className="playbar-control-btn" title="Next" disabled={!track} onClick={onNext}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6zm9-12h2v12h-2z"/>
            </svg>
          </button>

          <button 
            className={`playbar-control-btn ${repeatMode !== 'off' ? 'playbar-repeat-active' : ''}`} 
            title={repeatMode === 'track' ? "Repeat One" : repeatMode === 'all' ? "Repeat All" : "Repeat"} 
            disabled={!track}
            onClick={onRepeatToggle}
            style={{ position: 'relative' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            {repeatMode === 'track' && (
              <span style={{
                position: 'absolute',
                fontSize: '8px',
                fontWeight: '800',
                color: '#F26B50',
                top: '2px',
                right: '6px',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                1
              </span>
            )}
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="playbar-timeline">
          <span className="playbar-time">{formatTime(currentTime)}</span>
          <div 
            className="playbar-scrubber-wrapper"
            onMouseDown={handleTimeDrag}
          >
            <div className="playbar-scrubber-track">
              <div className="playbar-scrubber-progress" style={{ width: `${progressPercent}%` }}>
                <div className="playbar-scrubber-handle" />
              </div>
            </div>
          </div>
          <span className="playbar-time">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Volume & Tools (Right) */}
      <div className="playbar-right">
        {/* Queue button */}
        <button className="playbar-utility-btn" title="Queue" disabled={!track}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>

        {/* Side Panel button */}
        <button 
          className={`playbar-utility-btn ${isNowPlayingOpen ? "text-[#F26B50]" : ""}`} 
          title="Side Panel" 
          disabled={!track}
          onClick={onNowPlayingToggle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>

        {/* Vertical Divider */}
        <div className="playbar-divider" />

        {/* Volume scrubber */}
        <div className="playbar-volume-control">
          <button className="playbar-utility-btn" title="Mute">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {volume === 0 ? (
                <line x1="23" y1="9" x2="17" y2="15" />
              ) : (
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
              )}
            </svg>
          </button>
          <div 
            className="playbar-volume-slider-wrapper"
            onMouseDown={handleVolumeDrag}
          >
            <div className="playbar-volume-slider-track">
              <div className="playbar-volume-slider-progress" style={{ width: `${volume}%` }}>
                <div className="playbar-volume-slider-handle" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
