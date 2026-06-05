import React from "react";
import "./playerfullscreen.css";

interface PlayerFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  track: any;
  isPlaying: boolean;
  onPlayToggle: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  repeatMode: "off" | "all" | "track";
  onRepeatToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function PlayerFullscreen({
  isOpen,
  onClose,
  track,
  isPlaying,
  onPlayToggle,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  repeatMode,
  onRepeatToggle,
  onNext,
  onPrevious
}: PlayerFullscreenProps) {

  if (!track) return null;

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleTimeDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
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

  return (
    <div className={`fullscreen-player ${isOpen ? "active" : ""}`}>
      {/* Main Content Area */}
            {/* Header Close Panel */}
            <div className="fs-header">
              <button className="fs-close-btn" onClick={onClose} title="Minimize">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 8 8 8 8 4" />
                  <polyline points="20 8 16 8 16 4" />
                  <polyline points="4 16 8 16 8 20" />
                  <polyline points="20 16 16 16 16 20" />
                </svg>
              </button>
              <span className="fs-header-label">Now Playing</span>
              <div style={{ width: 44 }} /> {/* balance spacing */}
            </div>

            {/* Main Content Area */}
            <div className="fs-container">
              
              {/* Left Side: Realistic Vinyl Disk */}
              <div className="fs-vinyl-section">
                <div className="fs-vinyl-card">
                  <div className={`fs-vinyl-disk ${isPlaying ? "spinning" : ""}`}>
                    {/* Concentric groove rings */}
                    <div className="fs-groove fs-groove-1" />
                    <div className="fs-groove fs-groove-2" />
                    <div className="fs-groove fs-groove-3" />
                    <div className="fs-groove fs-groove-4" />
                    <div className="fs-groove fs-groove-5" />
                    <div className="fs-groove fs-groove-6" />
                    
                    {/* Album cover in center */}
                    <div className="fs-poster-wrapper">
                      <img key={track.poster} src={track.poster} alt={track.title} className="fs-poster fs-poster-fade" />
                    </div>
                    
                    {/* Spindle hole */}
                    <div className="fs-center-hole" />
                  </div>
                </div>
              </div>

              {/* Right Side: Metadata and Synced Playback Controls */}
              <div className="fs-controls-section">
                <div className="fs-metadata">
                  <h1 className="fs-track-title" title={track.title}>{track.title}</h1>
                  <p className="fs-track-artist" title={track.artist}>{track.artist}</p>
                </div>

                {/* Timeline Scrubber */}
                <div className="fs-timeline-container">
                  <div className="fs-timeline-wrapper" onMouseDown={handleTimeDrag}>
                    <div className="fs-timeline-track">
                      <div className="fs-timeline-progress" style={{ width: `${progressPercent}%` }}>
                        <div className="fs-timeline-handle" />
                      </div>
                    </div>
                  </div>
                  <div className="fs-time-labels">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Audio Controls Row */}
                <div className="fs-controls-row">
                  <button className="fs-control-btn" title="Shuffle" disabled>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 3 21 3 21 8" />
                      <line x1="4" y1="20" x2="21" y2="3" />
                      <polyline points="21 16 21 21 16 21" />
                      <line x1="15" y1="15" x2="21" y2="21" />
                      <line x1="4" y1="4" x2="9" y2="9" />
                    </svg>
                  </button>

                  <button className="fs-control-btn" title="Previous" onClick={onPrevious}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                    </svg>
                  </button>

                  <button 
                    className="fs-play-pause-btn" 
                    onClick={onPlayToggle}
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24" className="text-black ml-[1px]">
                        <path d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24" className="text-black ml-[1px]">
                        <path d="M8 5.25v13.5a.75.75 0 0 0 1.152.628l11.25-6.75a.75.75 0 0 0 0-1.256L9.152 4.622A.75.75 0 0 0 8 5.25Z" />
                      </svg>
                    )}
                  </button>

                  <button className="fs-control-btn" title="Next" onClick={onNext}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 18l8.5-6L6 6zm9-12h2v12h-2z"/>
                    </svg>
                  </button>

                  <button 
                    className={`fs-control-btn ${repeatMode !== 'off' ? 'fs-repeat-active' : ''}`} 
                    title={repeatMode === 'track' ? "Repeat One" : repeatMode === 'all' ? "Repeat All" : "Repeat"} 
                    onClick={onRepeatToggle}
                    style={{ position: 'relative' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    {repeatMode === 'track' && (
                      <span className="fs-repeat-badge">1</span>
                    )}
                  </button>
                </div>

                {/* Volume Control Slider */}
                <div className="fs-volume-container">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  <div className="fs-volume-slider-wrapper" onMouseDown={handleVolumeDrag}>
                    <div className="fs-volume-slider-track">
                      <div className="fs-volume-slider-progress" style={{ width: `${volume}%` }}>
                        <div className="fs-volume-slider-handle" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
    </div>
  );
}
