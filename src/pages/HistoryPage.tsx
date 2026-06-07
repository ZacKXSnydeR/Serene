import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrackGrid } from "../components/home/TrackGrid";
import { getPosterUrl } from "../utils/imageUtils";
import { usePlayerStore } from "../store/usePlayerStore";
import { getBaseUrl } from "../api/client";
import { invoke } from "@tauri-apps/api/core";

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocal, setIsLocal] = useState(false);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playPlaylist = usePlayerStore((state) => state.playPlaylist);

  const fetchHistory = async () => {
    setIsLoading(true);
    setIsLocal(false);
    try {
      const res = await fetch(`${getBaseUrl()}/history`);
      if (!res.ok) throw new Error("Auth Failed");
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
      setIsLocal(true);
      try {
        const localTracks: any[] = await invoke('get_local_history');
        const mapped = localTracks.map((t: any) => ({
            id: t.video_id,
            title: t.title,
            artist: t.artist,
            poster: t.poster
        }));
        setTracks(mapped);
      } catch (localErr) {
        console.error("Failed to load local tracks", localErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleTrackSelect = (track: any) => {
    const index = tracks.findIndex((t) => t.id === track.id);
    playPlaylist(tracks, index !== -1 ? index : 0);
  };

  return (
    <div className="w-full flex flex-col items-center pb-24">
      {isLocal && (
        <div className="w-full px-8 mt-4 flex justify-start">
          <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 border border-white/5 rounded-full px-4 py-1.5">
            <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>You're in Offline Mode.</span>
            <button 
              onClick={() => navigate('/profile')}
              className="ml-1 text-white/70 hover:text-white font-medium underline decoration-white/30 underline-offset-2 transition-colors"
            >
              Log in
            </button>
            <span className="ml-1">to sync.</span>
          </div>
        </div>
      )}

      <div className="w-full px-8 mt-12">
        <TrackGrid 
          tracks={tracks}
          onTrackSelect={handleTrackSelect}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          isLoading={isLoading && tracks.length === 0}
          title={isLocal ? "Local Listening History" : "Listening History"}
          onArtistClick={(id) => navigate(`/artist/${id}`)}
        />
      </div>
    </div>
  );
};
