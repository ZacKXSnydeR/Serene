import React, { useEffect, useState } from "react";
import { fetchAlbumDetails } from "../../services/youtube/youtubeSearch";
import { YouTubeAlbumDetails, YouTubeSearchResult } from "../../services/youtube/types";

import "../artist/artistpage.css";
import "./AlbumPage.css";

interface AlbumPageProps {
  albumBrowseId: string;
  albumTitle: string;
  albumArtist: string;
  albumThumbnail: string;
  onClose: () => void;
  onPlayPlaylist: (tracks: any[], startIndex?: number) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  isShuffleOn?: boolean;
  setIsShuffleOn?: (on: boolean) => void;
}

export const AlbumPage: React.FC<AlbumPageProps> = ({ 
  albumBrowseId, 
  albumTitle,
  albumArtist,
  albumThumbnail,
  onClose, 
  onPlayPlaylist,
  currentTrackId,
  isPlaying,
  isShuffleOn,
  setIsShuffleOn
}) => {
  const [album, setAlbum] = useState<YouTubeAlbumDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadAlbum = async () => {
      setLoading(true);
      const data = await fetchAlbumDetails(albumBrowseId, albumTitle, albumArtist, albumThumbnail);
      if (mounted && data) {
        setAlbum(data);
      }
      if (mounted) setLoading(false);
    };

    loadAlbum();
    return () => { mounted = false; };
  }, [albumBrowseId, albumTitle, albumArtist, albumThumbnail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen relative z-50 text-white font-bold text-xl">
        Loading Album...
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen relative z-50 text-white gap-4">
        <h2 className="text-2xl font-bold">Album not found</h2>
        <button onClick={onClose} className="px-6 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  // Convert to internal Track format for TrackGrid
  const mapToInternalTrack = (item: YouTubeSearchResult): any => {
    return {
      id: item.id,
      title: item.title,
      artist: item.uploader || albumArtist,
      artistId: item.uploader_id,
      album: albumTitle,
      poster: item.thumbnail || albumThumbnail,
      previewUrl: "",
      source: "youtube",
      views: item.views
    };
  };

  const tracks = album.tracks.map(mapToInternalTrack);

  const handleShufflePlay = () => {
    if (tracks.length === 0) return;
    if (setIsShuffleOn) setIsShuffleOn(true);
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    onPlayPlaylist(shuffled, 0);
  };

  return (
    <div className="relative w-full z-50 min-h-screen pb-32">
      {/* Top Right Back Button - Sticky to stay in view */}
      <div className="sticky top-8 z-[100] flex justify-end w-full px-8 pointer-events-none h-0">
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E65100] text-black hover:scale-105 transition-transform shadow-lg cursor-pointer pointer-events-auto"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      </div>

      <div className="w-full max-w-7xl mx-auto px-8 md:px-12 pt-16 md:pt-24 pb-48 flex flex-col md:flex-row gap-12 md:gap-24 relative">
        
        {/* Left Sticky Column */}
        <div className="w-full md:w-[35%] flex flex-col items-center md:items-start gap-8 sticky top-32 self-start z-10">
          <div className="album-vinyl-card album-vinyl-card-large" style={{ width: 'auto' }} onClick={() => tracks.length > 0 && onPlayPlaylist(tracks, 0)}>
            <div className="album-vinyl-wrapper cursor-pointer group">
              {/* Vinyl Disc */}
              <div className={`album-vinyl-disc ${isPlaying && currentTrackId ? 'playing' : ''}`}>
                <div className="album-vinyl-groove album-vinyl-groove-1"></div>
                <div className="album-vinyl-groove album-vinyl-groove-2"></div>
                <div className="album-vinyl-groove album-vinyl-groove-3"></div>
                <div className="album-vinyl-label">
                  <img src={album.thumbnail?.replace(/=w\d+-h\d+/g, "=w500-h500").replace("hqdefault", "maxresdefault")} alt="label" />
                  <div className="album-vinyl-hole"></div>
                </div>
              </div>
              {/* Sleeve */}
              <div className="album-vinyl-sleeve">
                <img src={album.thumbnail?.replace(/=w\d+-h\d+/g, "=w1000-h1000").replace("hqdefault", "maxresdefault")} alt={album.title} />
                <div className="album-sleeve-gloss"></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full text-center md:text-left">
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg leading-tight">
              {album.title}
            </h1>
            <h2 className="text-2xl text-white/80 font-bold">
              {album.artist}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-lg text-white/50 font-medium m-0">
                {album.year} • {album.track_count}
              </p>
              
              <button 
                onClick={handleShufflePlay}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all shadow-md cursor-pointer ${
                  isShuffleOn 
                    ? 'bg-[#E65100] text-black scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105 active:scale-95'
                }`}
                title="Shuffle Play"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8"></polyline>
                  <line x1="4" y1="20" x2="21" y2="3"></line>
                  <polyline points="21 16 21 21 16 21"></polyline>
                  <line x1="15" y1="15" x2="21" y2="21"></line>
                  <line x1="4" y1="4" x2="9" y2="9"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right Scrollable Column */}
        <div className="w-full md:w-[65%] flex flex-col z-20">
          <div className="album-track-list">
            {tracks.length === 0 ? (
              <div className="text-white/50 text-center py-12">No tracks loaded due to API limit.</div>
            ) : (
              tracks.map((track, index) => (
                <div 
                  key={track.id} 
                  className={`album-track-item ${currentTrackId === track.id ? 'playing' : ''}`}
                  onClick={() => onPlayPlaylist(tracks, index)}
                >
                  <div className="album-track-number">
                    {currentTrackId === track.id && isPlaying ? (
                      <div className="flex items-end justify-center gap-1 h-4 w-full">
                        <div className="eq-bar eq-bar-1"></div>
                        <div className="eq-bar eq-bar-2"></div>
                        <div className="eq-bar eq-bar-3"></div>
                      </div>
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <div className="album-track-info">
                    <span className="album-track-title">{track.title}</span>
                    <span className="album-track-stats">
                      <span className="bg-white/20 text-white text-[10px] px-1 rounded uppercase font-bold tracking-wider">E</span>
                      {track.views ? track.views : 'Unknown plays'}
                    </span>
                  </div>
                  <div className="album-track-duration">
                    {album.tracks[index].duration || (index % 2 === 0 ? "3:14" : "2:45")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AlbumPage;
