import React, { useEffect, useState } from 'react';
import { fetchArtistDetails } from '../../services/youtube/youtubeSearch';
import { YouTubeArtistDetails, YouTubeSearchResult } from '../../services/youtube/types';
import './artistpage.css';

interface ArtistPageProps {
  browseId: string;
  onClose: () => void;
  onPlayTrack: (track: any) => void;
  currentTrackId?: string | number;
  fallbackViews?: string;
  onAlbumClick?: (album: YouTubeSearchResult) => void;
}

const ArtistPage: React.FC<ArtistPageProps> = ({ browseId, onClose, onPlayTrack, currentTrackId, fallbackViews, onAlbumClick }) => {
  const [artist, setArtist] = useState<YouTubeArtistDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [showAllSongs, setShowAllSongs] = useState(false);

  useEffect(() => {
    const loadArtist = async () => {
      setIsLoading(true);
      const data = await fetchArtistDetails(browseId);
      setArtist(data);
      setIsLoading(false);
    };

    if (browseId) {
      loadArtist();
    }
  }, [browseId]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 z-50 bg-transparent flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="absolute inset-0 z-50 bg-transparent flex flex-col items-center justify-center text-white/50">
        <p>Failed to load artist details</p>
        <button onClick={onClose} className="mt-4 px-6 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  // Map YouTubeSearchResult to our internal track format
  const mapToInternalTrack = (item: YouTubeSearchResult) => {
    return {
      id: item.id,
      title: item.title,
      artist: item.uploader || artist.name,
      artistId: item.uploader_id || browseId,
      album: "YT Music",
      poster: item.thumbnail,
      previewUrl: "",
      source: "youtube",
      views: item.views
    };
  };

  const mappedTopSongs = artist.top_songs.map(mapToInternalTrack);
  const displayedSongs = showAllSongs ? mappedTopSongs : mappedTopSongs.slice(0, 5);

  const displayViews = artist.views || fallbackViews;

  const renderVinylCard = (item: YouTubeSearchResult, typeLabel: string, index: number) => {
    return (
      <div key={item.id || item.browse_id || `vinyl-${index}`} className="album-vinyl-card" onClick={() => onAlbumClick && onAlbumClick({ ...item, uploader: artist?.name || item.uploader })}>
        <div className="album-vinyl-wrapper">
          {/* Vinyl Disc */}
          <div className="album-vinyl-disc">
            <div className="album-vinyl-groove album-vinyl-groove-1"></div>
            <div className="album-vinyl-groove album-vinyl-groove-2"></div>
            <div className="album-vinyl-groove album-vinyl-groove-3"></div>
            <div className="album-vinyl-label">
              <img src={item.thumbnail?.replace(/=w\d+-h\d+/g, "=w500-h500").replace("hqdefault", "maxresdefault")} alt="label" />
              <div className="album-vinyl-hole"></div>
            </div>
          </div>
          {/* Sleeve */}
          <div className="album-vinyl-sleeve">
            <img src={item.thumbnail?.replace(/=w\d+-h\d+/g, "=w1000-h1000").replace("hqdefault", "maxresdefault")} alt={item.title} />
            <div className="album-sleeve-gloss"></div>
          </div>
        </div>
        <p className="album-card-title">{item.title}</p>
        <p className="album-card-subtitle">{item.uploader || typeLabel}</p>
      </div>
    );
  };

  return (
    <div className="relative w-full z-50 min-h-screen">
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

      <div className="w-full max-w-7xl mx-auto px-12 pt-24 pb-48 flex flex-col gap-16 relative">
        
        {/* Left Aligned Hero Section */}
        <div className="flex flex-col items-start gap-6 relative z-10">
          {/* Circular Profile Picture */}
          <div className="w-64 h-64 rounded-full overflow-hidden shadow-2xl border-4 border-white/10">
             <img 
               src={artist.image?.replace(/=w\d+-h\d+/g, "=w1000-h1000").replace("hqdefault", "maxresdefault")} 
               alt={artist.name} 
               className="w-full h-full object-cover"
             />
          </div>

          <div className="flex flex-col gap-2 mt-2 w-full max-w-3xl">
            {/* Name and Badge */}
            <div className="flex items-center gap-4">
              <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-lg">
                {artist.name}
              </h1>
              {/* Meta Verified style badge */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F26B50] text-black shadow-md mt-2" title="Verified Artist">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>

            {/* Monthly Audience */}
            {displayViews && (
              <p className="text-[#F26B50] text-lg font-bold tracking-wide uppercase">
                {displayViews}
              </p>
            )}

            {/* Expandable Bio */}
            {artist.description && (
              <div className="mt-4">
                <p className={`text-white/70 font-medium leading-relaxed ${isBioExpanded ? '' : 'line-clamp-3'}`}>
                  {artist.description}
                </p>
                {artist.description.length > 150 && (
                  <button 
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                    className="text-white/50 text-sm font-bold hover:text-white mt-2 transition-colors uppercase tracking-wider"
                  >
                    {isBioExpanded ? "Show Less" : "Show More"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top Songs Section */}
        {mappedTopSongs.length > 0 && (
          <div className="flex flex-col gap-6 relative z-20">
            <h2 className="text-3xl font-black text-white tracking-tight">Top Songs</h2>
            <div className="flex flex-col gap-2">
              {displayedSongs.map((track, index) => {
                const isCurrent = currentTrackId === track.id;
                return (
                  <div 
                    key={track.id}
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors group ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5 bg-black/20'}`}
                    onClick={() => onPlayTrack(track)}
                  >
                    <div className="w-6 text-center text-white/50 text-sm font-bold group-hover:text-white transition-colors">
                      {isCurrent ? (
                        <div className="flex items-end justify-center gap-[2px] h-4 mx-auto w-4">
                          <div className="eq-bar eq-bar-1"></div>
                          <div className="eq-bar eq-bar-2"></div>
                          <div className="eq-bar eq-bar-3"></div>
                        </div>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <img 
                      src={track.poster} 
                      alt={track.title} 
                      className="w-12 h-12 rounded-md object-cover shadow-md"
                    />
                    <div className="flex-1 flex flex-col justify-center">
                      <p className={`font-bold text-base truncate ${isCurrent ? 'text-[#F26B50]' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="text-white/50 text-sm truncate">
                        {track.artist}
                      </p>
                    </div>
                    {track.views && (
                      <div className="text-white/40 text-sm hidden md:block pr-4">
                        {track.views} plays
                      </div>
                    )}
                  </div>
                );
              })}
              
              {mappedTopSongs.length > 5 && (
                <div className="mt-4 flex justify-start">
                  <button 
                    onClick={() => setShowAllSongs(!showAllSongs)}
                    className="px-6 py-2 bg-white/10 text-white border border-white/20 rounded-full font-bold hover:bg-white/20 transition-colors"
                  >
                    {showAllSongs ? "Show Less" : "Show All"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Albums Section */}
        {artist.albums.length > 0 && (
          <div className="flex flex-col gap-6 relative z-20">
            <h2 className="text-3xl font-black text-white tracking-tight">Albums</h2>
            <div className="album-card-grid">
              {artist.albums.map((album, index) => renderVinylCard(album, "Album", index))}
            </div>
          </div>
        )}

        {/* Singles Section */}
        {artist.singles.length > 0 && (
          <div className="flex flex-col gap-6 relative z-20">
            <h2 className="text-3xl font-black text-white tracking-tight">Singles & EPs</h2>
            <div className="album-card-grid">
              {artist.singles.map((single, index) => renderVinylCard(single, "Single", index))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ArtistPage;
