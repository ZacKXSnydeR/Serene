import "./trackgrid.css";

interface TrackGridProps {
  tracks: any[];
  onTrackSelect: (track: any) => void;
  currentTrackId?: string | number;
  isPlaying?: boolean;
  isLoading: boolean;
  title?: string;
  onArtistClick?: (id: string) => void;
}

export function TrackGrid({ tracks, onTrackSelect, currentTrackId, isPlaying, isLoading, title, onArtistClick }: TrackGridProps) {
  const sectionTitle = title || "Today's Hits";

  // If loading, render the pulsing dark shimmer skeletons!
  if (isLoading) {
    const skeletonCards = Array.from({ length: 6 });
    return (
      <div className="track-grid-section">
        <h2 className="track-grid-section-title">{sectionTitle}</h2>
        <div className="track-grid-container">
          {skeletonCards.map((_, index) => {
            return (
              <div 
                key={index} 
                className="track-card track-card-skeleton"
              >
                <div className="track-card-poster-wrapper track-card-skeleton-poster">
                  <div className="track-card-skeleton-shimmer" />
                </div>
                <div className="track-card-info">
                  <div className="track-card-skeleton-text title-skeleton" />
                  <div className="track-card-skeleton-text artist-skeleton" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="track-grid-section">
        <h2 className="track-grid-section-title">{sectionTitle}</h2>
        <div className="track-grid-empty-state">
          <p>No tracks found. Type in the search bar above and press Enter to search!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="track-grid-section">
      <h2 className="track-grid-section-title">{sectionTitle}</h2>
      <div className="track-grid-container">
        {tracks.map((track, index) => {
          const isCurrent = currentTrackId === track.id;
          const showPause = isCurrent && isPlaying;

          return (
            <div 
              key={track.id || track.browse_id || `track-fallback-${index}`} 
              className={`track-card ${isCurrent ? "track-card-active" : ""}`}
              onClick={() => onTrackSelect(track)}
            >
              {/* Poster cover art */}
              <div className="track-card-poster-wrapper">
                <img src={track.poster} alt={track.title} className="track-card-poster-img" />
                <div className="track-card-poster-overlay" />
                
                {/* Floating play button revealing strictly on hover */}
                <button 
                  className={`track-card-play-btn ${showPause ? "track-card-play-btn-active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackSelect(track);
                  }}
                  title={showPause ? `Pause ${track.title}` : `Play ${track.title}`}
                >
                  {showPause ? (
                    <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Album/Track Metadata Info */}
              <div className="track-card-info">
                <p className="track-card-title" title={track.title}>{track.title}</p>
                <p 
                  className={`track-card-artist ${track.artistId ? 'hover:underline cursor-pointer transition-all hover:text-white' : ''}`} 
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
