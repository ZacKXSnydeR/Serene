import React, { useEffect, useState } from "react";
interface SearchResult {
  id?: string;
  videoId?: string;
  title: string;
  thumbnail?: string;
  thumbnails?: { url: string; width: number; height: number }[];
  duration?: string;
  uploader?: string;
  uploader_id?: string;
  views?: string;
  result_type?: string;
  browse_id?: string;
  date?: string;
  isExplicit?: boolean;
}

interface AlbumDetails {
  title: string;
  artist: string;
  year: string;
  track_count: string;
  thumbnail: string;
  tracks: SearchResult[];
}

import "../artist/artistpage.css";
import "./AlbumPage.css";
import { getHighResImage, getPosterUrl, resolveImageUrl } from "../../utils/imageUtils";

interface AlbumPageProps {
  albumBrowseId: string;
  albumTitle: string;
  albumArtist: string;
  albumThumbnail: string;
  type?: "album" | "playlist";
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
  type = "album",
  onClose, 
  onPlayPlaylist,
  currentTrackId,
  isPlaying,
  isShuffleOn,
  setIsShuffleOn
}) => {
  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadAlbum = async () => {
      setLoading(true);
      try {
        const endpoint = type === "playlist" ? `/playlist/${albumBrowseId}` : `/album/${albumBrowseId}`;
        const res = await fetch(`http://127.0.0.1:5050${endpoint}`);
        const data = await res.json();
        if (mounted) {
          setAlbum({
            title: data.title || albumTitle,
            artist: data.author?.name || (typeof data.author === 'string' ? data.author : null) || data.artists?.[0]?.name || albumArtist,
            year: data.year || "",
            track_count: data.trackCount ? `${data.trackCount} songs` : "0 songs",
            thumbnail: resolveImageUrl(data, { fallbackUrl: getHighResImage(albumThumbnail) }),
            tracks: data.tracks || []
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAlbum();
    return () => { mounted = false; };
  }, [albumBrowseId, albumTitle, albumArtist, albumThumbnail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen relative z-50 text-white font-bold text-xl">
        Loading {type === "playlist" ? "Playlist" : "Album"}...
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen relative z-50 text-white gap-4">
        <h2 className="text-2xl font-bold">{type === "playlist" ? "Playlist" : "Album"} not found</h2>
        <button onClick={onClose} className="px-6 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  // Convert to internal Track format for TrackGrid
  const mapToInternalTrack = (item: SearchResult): any => {
    return {
      id: item.videoId || item.id,
      title: item.title,
      artist: item.uploader || albumArtist,
      artistId: item.uploader_id,
      album: albumTitle,
      poster: getPosterUrl(item) || getHighResImage(albumThumbnail),
      previewUrl: "",
      source: "youtube",
      views: item.views,
      date: item.date,
      isExplicit: item.isExplicit
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
                  <img src={album.thumbnail} alt="label" />
                  <div className="album-vinyl-hole"></div>
                </div>
              </div>
              {/* Sleeve */}
              <div className="album-vinyl-sleeve">
                <img src={album.thumbnail} alt={album.title} />
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
              <div className="text-white/50 text-center py-12">No tracks found in this {type === "playlist" ? "playlist" : "album"}.</div>
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
                      {track.isExplicit && (
                        <span className="bg-white/20 text-white text-[10px] px-1 rounded uppercase font-bold tracking-wider mr-2">E</span>
                      )}
                      {track.views || track.date ? (
                        <>{track.views ? (track.views.includes('views') ? track.views : `${track.views} plays`) : track.date}</>
                      ) : (
                        <span className="text-white/40">Audio Track</span>
                      )}
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
