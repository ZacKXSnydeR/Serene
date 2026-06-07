import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAlbum } from '../api/queries';
import { usePlayerStore } from '../store/usePlayerStore';
import { getHighResImage, getPosterUrl, resolveImageUrl } from '../utils/imageUtils';
import '../components/album/AlbumPage.css';

export const AlbumPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: albumData, isLoading } = useAlbum(id || null);

  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const isShuffleOn = usePlayerStore(state => state.isShuffleOn);
  
  const toggleShuffle = usePlayerStore(state => state.toggleShuffle);
  const playPlaylist = usePlayerStore(state => state.playPlaylist);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] text-white font-bold text-xl">
        Loading...
      </div>
    );
  }

  if (!albumData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-white gap-4">
        <h2 className="text-2xl font-bold">Album or Playlist not found</h2>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  const album = {
    title: albumData.title || "Unknown",
    artist: albumData.author?.name || (typeof albumData.author === 'string' ? albumData.author : null) || albumData.artists?.[0]?.name || "Unknown Artist",
    year: albumData.year || "",
    track_count: albumData.trackCount ? `${albumData.trackCount} songs` : "0 songs",
    thumbnail: resolveImageUrl(albumData, { fallbackUrl: getHighResImage(albumData.thumbnail) }),
    tracks: albumData.tracks || []
  };

  const mapToInternalTrack = (item: any): any => ({
    id: item.videoId || item.id,
    title: item.title,
    artist: item.uploader || album.artist,
    artistId: item.uploader_id,
    album: album.title,
    poster: getPosterUrl(item) || getHighResImage(album.thumbnail),
    previewUrl: "",
    source: "youtube",
    views: item.views,
    date: item.date,
    isExplicit: item.isExplicit
  });

  const tracks = album.tracks.map(mapToInternalTrack);

  const handlePlayPlaylist = (playlistTracks: any[], startIndex = 0) => {
    playPlaylist(playlistTracks, startIndex);
  };

  const handleShufflePlay = () => {
    if (tracks.length === 0) return;
    if (!isShuffleOn) toggleShuffle();
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    handlePlayPlaylist(shuffled, 0);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-8 md:px-12 pt-12 pb-48 flex flex-col md:flex-row gap-12 md:gap-24 relative">
      <div className="w-full md:w-[35%] flex flex-col items-center md:items-start gap-8 sticky top-32 self-start z-10">
        <div className="album-vinyl-card album-vinyl-card-large" style={{ width: 'auto' }} onClick={() => tracks.length > 0 && handlePlayPlaylist(tracks, 0)}>
          <div className="album-vinyl-wrapper cursor-pointer group">
            <div className={`album-vinyl-disc ${isPlaying && currentTrack?.album === album.title ? 'playing' : ''}`}>
              <div className="album-vinyl-groove album-vinyl-groove-1"></div>
              <div className="album-vinyl-groove album-vinyl-groove-2"></div>
              <div className="album-vinyl-groove album-vinyl-groove-3"></div>
              <div className="album-vinyl-label">
                <img src={album.thumbnail} alt="label" />
                <div className="album-vinyl-hole"></div>
              </div>
            </div>
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
              {album.year} {album.year && '•'} {album.track_count}
            </p>
            
            <button 
              onClick={handleShufflePlay}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all shadow-md cursor-pointer ${
                isShuffleOn ? 'bg-[#E65100] text-black scale-105' : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105 active:scale-95'
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

      <div className="w-full md:w-[65%] flex flex-col z-20">
        <div className="album-track-list">
          {tracks.length === 0 ? (
            <div className="text-white/50 text-center py-12">No tracks found.</div>
          ) : (
            tracks.map((track: any, index: number) => (
              <div 
                key={track.id} 
                className={`album-track-item ${currentTrack?.id === track.id ? 'playing' : ''}`}
                onClick={() => handlePlayPlaylist(tracks, index)}
              >
                <div className="album-track-number">
                  {currentTrack?.id === track.id && isPlaying ? (
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
  );
};
