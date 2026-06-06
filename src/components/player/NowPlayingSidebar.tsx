import React, { useState, useEffect } from "react";
import { getPosterUrl } from "../../utils/imageUtils";

import "./nowplayingsidebar.css";

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
  onFullscreenToggle
}: NowPlayingSidebarProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [popularFetchedTracks, setPopularFetchedTracks] = useState<any[]>([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [artistDetails, setArtistDetails] = useState<any>(null);
  const [artistStats, setArtistStats] = useState<string>("");

  useEffect(() => {
    if (!track || !track.artist) return;
    let isMounted = true;
    setIsLoadingPopular(true);
    setPopularFetchedTracks([]); // Clear previous
    setArtistDetails(null);
    setArtistStats("");

    const loadArtistDetails = async () => {
      if (track.artistId) {
        try {
          const res = await fetch(`http://127.0.0.1:5050/artist/${track.artistId}`);
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
              const mappedPopular = data.songs.results.slice(0, 3).map((item: any) => ({
                id: item.videoId || item.id || item.browseId,
                title: item.title,
                artist: item.artists?.[0]?.name || data.name,
                poster: getPosterUrl(item),
                views: item.views || "",
                source: "youtube"
              }));
              setPopularFetchedTracks(mappedPopular);
            }
          }
        } catch (err) {
          console.error("Failed to load artist details for sidebar:", err);
        } finally {
          if (isMounted) setIsLoadingPopular(false);
        }
      } else {
        // Simulate loading for UI consistency if no artistId
        setTimeout(() => {
          if (!isMounted) return;
          setIsLoadingPopular(false);
        }, 500);
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

  // Filter other popular songs by this artist or fall back to first few tracks
  const localPopularTracks = allTracks
    .filter(t => t.artist === track.artist && t.id !== track.id)
    .slice(0, 3);

  const fallbackPopularTracks = localPopularTracks.length > 0 
    ? localPopularTracks 
    : allTracks.filter(t => t.id !== track.id).slice(0, 3);

  const displayedPopular = popularFetchedTracks.length > 0 ? popularFetchedTracks : fallbackPopularTracks;

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

      {/* Scrollable Container */}
      <div className="nowplaying-scroll-body">
        
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
            <button className="nowplaying-control-btn" title="Shuffle" disabled>
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

        {/* 4. Utilities Row (Mic, List, Headphones, Mute + Volume, Expand) */}
        <div className="nowplaying-utilities-row">
          <button className="nowplaying-util-btn" title="Lyrics">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M3 20v-8a2 2 0 0 1 2-2h4M3 12a2 2 0 0 1 2-2h4M13 14V4a2 2 0 0 1 2-2h4" />
            </svg>
          </button>
          <button className="nowplaying-util-btn" title="Lyrics Sync">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <button className="nowplaying-util-btn" title="Connect to device">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
            </svg>
          </button>
          <button className="nowplaying-util-btn" title="Fullscreen" onClick={onFullscreenToggle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>

          {/* Volume scrubber inside sidebar */}
          <div className="nowplaying-util-btn" style={{ cursor: "default", padding: 0 }} title="Volume">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
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

        {/* 5. Scrollable Area: Popular List */}
        <div>
          <p className="nowplaying-section-title">
            {track.channelName || track.artist} Popular
          </p>
          <div className={`nowplaying-popular-list ${isLoadingPopular ? 'loading-opacity' : ''}`}>
            {displayedPopular.map((item, idx) => (
              <div 
                key={item.id} 
                className="popular-track-row"
                onClick={() => onTrackSelect(item)}
              >
                <span className="popular-track-index">{idx + 1}</span>
                <img src={item.poster} alt={item.title} className="popular-track-cover" />
                <div className="popular-track-meta">
                  <p className="popular-track-title" title={item.title}>{item.title}</p>
                  <p className="popular-track-plays">{item.views || "2.3M plays"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

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
