import "./recentlyplayed.css";

interface RecentlyPlayedProps {
  tracks: any[];
  onTrackSelect: (track: any) => void;
  currentTrackId?: string | number;
  isPlaying?: boolean;
}

export function RecentlyPlayed({ tracks, onTrackSelect, currentTrackId, isPlaying }: RecentlyPlayedProps) {
  if (!tracks || tracks.length === 0) return null;

  return (
    <div className="recently-played-section">
      <h2 className="recently-played-section-title">Recently Played</h2>
      <div className="recently-played-container">
        {tracks.map((track) => {
          const isCurrent = currentTrackId === track.id;
          const showPause = isCurrent && isPlaying;

          return (
            <div
              key={track.id}
              className={`recently-played-card ${isCurrent ? "recently-played-card-active" : ""}`}
              onClick={() => onTrackSelect(track)}
            >
              {/* Vinyl Disk holding the poster in the center */}
              <div className="recently-played-disk">
                <img
                  src={track.poster}
                  alt={track.title}
                  className="recently-played-disk-poster"
                />
                <div className="recently-played-disk-hole" />
              </div>

              {/* Glassmorphic Rectangle covering the right half */}
              <div className="recently-played-rectangle">
                <p className="recently-played-title" title={track.title}>
                  {track.title}
                </p>
                <p className="recently-played-artist" title={track.artist}>
                  {track.artist}
                </p>

                {/* Floating Play/Pause Button on Hover */}
                <button
                  className="recently-played-play-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackSelect(track);
                  }}
                  title={showPause ? `Pause ${track.title}` : `Play ${track.title}`}
                >
                  {showPause ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="14" y="4" width="4" height="16" rx="1" fill="black" />
                      <rect x="6" y="4" width="4" height="16" rx="1" fill="black" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" className="fill-black" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
