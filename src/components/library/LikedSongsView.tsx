import { useState, useEffect } from "react";
import { TrackGrid } from "../home/TrackGrid";
import { getPosterUrl } from "../../utils/imageUtils";

export function LikedSongsView({ onTrackSelect, currentTrackId, isPlaying, onArtistClick }: any) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [limit, setLimit] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const fetchLikedSongs = async (currentLimit: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://127.0.0.1:5050/library/liked?limit=${currentLimit}`);
      if (!res.ok) throw new Error("Failed to fetch liked songs. Are you authenticated?");
      const data = await res.json();
      
      const mappedTracks = (data.tracks || data).map((t: any) => ({
        id: t.videoId,
        title: t.title,
        artist: t.artists ? t.artists.map((a: any) => a.name).join(", ") : "Unknown Artist",
        artistId: t.artists?.[0]?.id,
        poster: getPosterUrl(t),
      }));
      
      setTracks(mappedTracks);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLikedSongs(limit);
  }, [limit]);

  return (
    <div className="w-full flex flex-col items-center pb-24">
      <div className="w-full px-8 mt-12">
        {error ? (
          <div className="text-red-400 text-center">{error}</div>
        ) : (
          <>
            <TrackGrid 
              tracks={tracks}
              onTrackSelect={onTrackSelect}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              isLoading={isLoading && tracks.length === 0}
              title="Liked Songs"
              onArtistClick={onArtistClick}
            />
            
            {tracks.length >= limit && (
              <div className="flex justify-center mt-8 mb-12">
                <button 
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all flex items-center gap-2"
                  onClick={() => setLimit(prev => prev + 30)}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
