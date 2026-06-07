import React, { useState, useEffect, useRef } from "react";
import Lenis from 'lenis';
import { getPosterUrl } from "../../utils/imageUtils";
import "./nowplayingsidebar.css";
import { getBaseUrl } from "../../api/client";
import { usePlayerStore } from "../../store/usePlayerStore";

interface NowPlayingSidebarProps {
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
  allTracks: any[];
  onTrackSelect: (track: any) => void;
  onArtistSelect?: (artistId: string) => void;
  repeatMode: "off" | "all" | "track";
  onRepeatToggle: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onFullscreenToggle?: () => void;
  isShuffleOn?: boolean;
  onToggleShuffle?: () => void;
}

export function NowPlayingSidebar({
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
  allTracks,
  onTrackSelect,
  onArtistSelect,
  repeatMode,
  onRepeatToggle,
  onNext,
  onPrevious,
  onFullscreenToggle,
  isShuffleOn,
  onToggleShuffle
}: NowPlayingSidebarProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [artistDetails, setArtistDetails] = useState<any>(null);
  const [artistStats, setArtistStats] = useState<string | null>(null);
  const queueRef = useRef<HTMLDivElement>(null);
  
  const isFetchingNextPage = usePlayerStore(state => state.isFetchingNextPage);
  const fetchNextQueueBatch = usePlayerStore(state => state.fetchNextQueueBatch);

  // Local Lenis instance for the queue sidebar
  useEffect(() => {
    if (!isOpen || !queueRef.current) return;
    
    const lenis = new Lenis({
      wrapper: queueRef.current,
      content: queueRef.current.firstElementChild as HTMLElement || queueRef.current,
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Stop scroll propagation so the global Lenis doesn't hijack it
    const el = queueRef.current;
    const stopProp = (e: Event) => e.stopPropagation();
    el.addEventListener('wheel', stopProp, { passive: false });
    el.addEventListener('touchstart', stopProp, { passive: false });
    el.addEventListener('touchmove', stopProp, { passive: false });

    return () => {
      el.removeEventListener('wheel', stopProp);
      el.removeEventListener('touchstart', stopProp);
      el.removeEventListener('touchmove', stopProp);
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!track || !track.artist) return;
    let isMounted = true;
    setArtistDetails(null);
    setArtistStats("");

    const loadArtistDetails = async () => {
      if (track.artistId) {
        try {
          const res = await fetch(`${getBaseUrl()}/artist/${track.artistId}`);
          if (!res.ok) throw new Error("Failed to fetch artist details");
          const data = await res.json();
          if (isMounted) {
            setArtistDetails({
              id: track.artistId,
              name: data.name || track.artist,
              description: data.description || "",
              image: getPosterUrl(data)
            });
            setArtistStats(data.views || data.subscribers || "");
            if (data.songs?.results) {
              // We no longer fetch popular songs for the sidebar queue, we use the global queue
            }
          }
        } catch (err) {
          console.error("Failed to load artist details for sidebar:", err);
        }
      }
    };

    loadArtistDetails();

    return () => { isMounted = false; };
  }, [track?.artist, track?.artistId]);

  if (!track) return null;

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Slidable/Draggable mouse handler for sidebar seek bar
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

  // Slidable/Draggable mouse handler for sidebar volume bar
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
  
  const handleScroll = () => {
    if (queueRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = queueRef.current;
      // If we are within 200px of the bottom, fetch next
      if (scrollHeight - scrollTop - clientHeight < 200) {
        if (!isFetchingNextPage) {
          fetchNextQueueBatch();
        }
      }
    }
  };

  return (
    <div className={`nowplaying-sidebar ${isOpen ? "open" : ""}`}>
      {/* Header */}
      <div className="nowplaying-header">
        <span className="nowplaying-header-title">Now Playing</span>
        <button className="nowplaying-close-btn" onClick={onClose} title="Close Panel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>


      {/* STICKY TOP CONTAINER */}
      <div className="nowplaying-sticky-top">
        
        {/* 1. Rotating Vinyl Disk */}
        <div className="nowplaying-disk-section">
          <div className={`vinyl-disk ${isPlaying ? "playing" : ""}`}>
            {/* Concentric Groove Lines */}
            <div className="vinyl-groove vinyl-groove-1" />
            <div className="vinyl-groove vinyl-groove-2" />
            <div className="vinyl-groove vinyl-groove-3" />
            
            {/* Album Cover inside disk */}
            <div className="vinyl-poster-wrapper">
              <img 
                key={track.poster} 
                src={track.poster} 
                alt={track.title} 
                className="vinyl-poster vinyl-poster-fade" 
              />
            </div>
            
            {/* Central Spindle Hole */}
            <div className="vinyl-center-hole" />
          </div>
        </div>

        {/* 2. Track Metadata (Title, Artist, Library Add) */}
        <div className="nowplaying-metadata-section">
          <div className="nowplaying-track-info">
            <p className="nowplaying-track-title" title={track.title}>{track.title}</p>
            <p className="nowplaying-track-artist" title={track.artist}>{track.artist}</p>
          </div>
          <button 
            className={`nowplaying-add-btn ${isLiked ? "active" : ""}`}
            onClick={() => setIsLiked(!isLiked)}
            title={isLiked ? "Saved to Library" : "Add to Library"}
          >
            <svg width="20" height="20" fill={isLiked ? "#F26B50" : "none"} stroke={isLiked ? "#F26B50" : "currentColor"} strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* 3. Timeline Scrubber */}
        <div className="nowplaying-controls-section">
          <div className="nowplaying-timeline">
            <span className="nowplaying-time">{formatTime(currentTime)}</span>
          <div 
            className="nowplaying-scrubber-wrapper"
            onMouseDown={handleTimeDrag}
          >
              <div className="nowplaying-scrubber-track">
                <div className="nowplaying-scrubber-progress" style={{ width: `${progressPercent}%` }}>
                  <div className="nowplaying-scrubber-handle" />
                </div>
              </div>
            </div>
            <span className="nowplaying-time">{formatTime(duration)}</span>
          </div>

          {/* Playback Controls Row */}
          <div className="nowplaying-playback-row">
            {/* Shuffle Button inside NowPlayingSidebar timeline tools */}
            <button 
              className={`nowplaying-control-btn ${isShuffleOn ? 'nowplaying-repeat-active' : ''}`} 
              title="Shuffle"
              onClick={onToggleShuffle}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </button>

            <button className="nowplaying-control-btn" title="Previous" onClick={onPrevious}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <button 
              className="nowplaying-play-pause-btn" 
              onClick={onPlayToggle}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" className="text-black ml-[1px]">
                  <path d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" className="text-black ml-[1px]">
                  <path d="M8 5.25v13.5a.75.75 0 0 0 1.152.628l11.25-6.75a.75.75 0 0 0 0-1.256L9.152 4.622A.75.75 0 0 0 8 5.25Z" />
                </svg>
              )}
            </button>

            <button className="nowplaying-control-btn" title="Next" onClick={onNext}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6zm9-12h2v12h-2z"/>
              </svg>
            </button>

            <button 
              className={`nowplaying-control-btn ${repeatMode !== 'off' ? 'nowplaying-repeat-active' : ''}`} 
              title={repeatMode === 'track' ? "Repeat One" : repeatMode === 'all' ? "Repeat All" : "Repeat"} 
              onClick={onRepeatToggle}
              style={{ position: 'relative' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                  top: '0px',
                  right: '2px',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  1
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 4. Utilities Row (Lyrics, Fullscreen, Mute + Volume) */}
        <div className="nowplaying-utilities-row">
          <button className="nowplaying-util-btn" title="Lyrics">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" />
              <circle cx="17" cy="7" r="5" />
            </svg>
          </button>
          
          <button className="nowplaying-util-btn" title="Fullscreen" onClick={onFullscreenToggle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>

          {/* Volume scrubber inside sidebar */}
          <div className="flex items-center gap-2">
            <div 
              className="nowplaying-util-btn" 
              style={{ padding: '0 4px' }} 
              title="Volume"
              onClick={() => {
                if (volume > 0) {
                  onVolumeChange(0);
                } else {
                  onVolumeChange(70);
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {volume > 0 ? (
                  <>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    {volume > 50 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
                  </>
                ) : (
                  <>
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </>
                )}
              </svg>
            </div>
            <div 
              className="nowplaying-volume-bar-wrapper"
              onMouseDown={handleVolumeDrag}
            >
              <div className="nowplaying-volume-bar-track">
                <div className="nowplaying-volume-bar-progress" style={{ width: `${volume}%` }}>
                  <div className="nowplaying-volume-bar-handle" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="nowplaying-section-title" style={{ marginTop: '8px', marginBottom: '0' }}>
          Up Next
        </p>
      </div>

      {/* SCROLLABLE QUEUE CONTAINER */}
      <div 
        className="nowplaying-scroll-queue" 
        ref={queueRef} 
        data-lenis-prevent="true"
        onScroll={handleScroll}
      >
          <div className="nowplaying-popular-list">
            {allTracks.length === 0 && (
              <p className="text-white/40 text-xs text-center py-4">Queue is empty</p>
            )}
            {allTracks.map((item, idx) => {
              const isCurrentlyPlaying = item.id === track?.id;
              
              return (
                <div 
                  key={`${item.id}-${idx}`} 
                  className={`popular-track-row ${isCurrentlyPlaying ? 'active-queue-item' : ''}`}
                  onClick={() => onTrackSelect(item)}
                >
                  <span className="popular-track-index">
                    {isCurrentlyPlaying ? (
                      <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" className="text-[#F26B50]">
                        <path d="M8 5.25v13.5a.75.75 0 0 0 1.152.628l11.25-6.75a.75.75 0 0 0 0-1.256L9.152 4.622A.75.75 0 0 0 8 5.25Z" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <img src={item.poster} alt={item.title} className="popular-track-cover" />
                  <div className="popular-track-meta">
                    <p className={`popular-track-title ${isCurrentlyPlaying ? 'text-[#F26B50]' : ''}`} title={item.title}>{item.title}</p>
                    <p className="popular-track-plays">{item.artist}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {isFetchingNextPage && (
            <div className="flex justify-center items-center py-4 text-[#F26B50]">
               <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            </div>
          )}
        </div>

      {/* STICKY BOTTOM CONTAINER */}
      <div className="nowplaying-sticky-bottom">
        {/* 6. Artist Details Section (Moved to bottom) */}
        {artistDetails && (
          <div 
            className="nowplaying-artist-card group" 
            onClick={() => {
              const targetId = artistDetails.browse_id || artistDetails.id;
              if (targetId && onArtistSelect) {
                onArtistSelect(targetId);
                onClose();
              } else {
                console.warn("No ID available to navigate to artist", artistDetails);
              }
            }}
          >
            <div className="nowplaying-artist-left">
              <div className="nowplaying-artist-avatar">
                 <img src={artistDetails.image} alt={artistDetails.name} />
              </div>
              <p className="nowplaying-artist-name">{artistDetails.name}</p>
            </div>
            
            <div className="nowplaying-artist-right">
               {artistStats && <p className="nowplaying-artist-stats">{artistStats}</p>}
               {artistDetails.description && (
                  <p className="nowplaying-artist-desc">{artistDetails.description}</p>
               )}
            </div>

            {/* Hover Arrow */}
            <div className="nowplaying-artist-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
