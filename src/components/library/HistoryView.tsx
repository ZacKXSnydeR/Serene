import { useState, useEffect } from "react";
import { TrackGrid } from "../home/TrackGrid";
import { getPosterUrl } from "../../utils/imageUtils";
import { getBaseUrl } from "../../api/client";

export function HistoryView({ onTrackSelect, currentTrackId, isPlaying, onArtistClick }: any) {
  const [allTracks, setAllTracks] = useState<any[]>([]);
  const [displayedTracks, setDisplayedTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [limit, setLimit] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getBaseUrl()}/history`);
      if (!res.ok) throw new Error("Failed to fetch history. Are you authenticated?");
      const data = await res.json();
      
      const mappedTracks = data.map((t: any) => ({
        id: t.videoId,
        title: t.title,
        artist: t.artists ? t.artists.map((a: any) => a.name).join(", ") : "Unknown Artist",
        artistId: t.artists?.[0]?.id,
        poster: getPosterUrl(t),
      }));
      
      setAllTracks(mappedTracks);
      setDisplayedTracks(mappedTracks.slice(0, 30));
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    setDisplayedTracks(allTracks.slice(0, limit));
  }, [limit, allTracks]);

  return (
    <div className="w-full flex flex-col items-center pb-24">
      <div className="w-full px-8 mt-12">
        {error ? (
          <div className="text-red-400 text-center">{error}</div>
        ) : (
          <>
            <TrackGrid 
              tracks={displayedTracks}
              onTrackSelect={onTrackSelect}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              isLoading={isLoading}
              title="Watch History"
              onArtistClick={onArtistClick}
            />
            
            {displayedTracks.length < allTracks.length && (
              <div className="flex justify-center mt-8 mb-12">
                <button 
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all flex items-center gap-2"
                  onClick={() => setLimit(prev => prev + 30)}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
