import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPosterUrl } from "../utils/imageUtils";
import { getBaseUrl } from "../api/client";
import { invoke } from "@tauri-apps/api/core";
import { CreatePlaylistModal } from "../components/library/CreatePlaylistModal";
import "../components/artist/artistpage.css";

export const PlaylistsPage: React.FC = () => {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocal, setIsLocal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<{id: string, title: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    setIsLocal(false);
    try {
      const res = await fetch(`${getBaseUrl()}/library/playlists`);
      if (!res.ok) throw new Error("Auth Failed");
      const data = await res.json();
      setPlaylists(data || []);
    } catch (err: any) {
      setIsLocal(true);
      try {
        const localPlaylists = await invoke<any[]>('get_local_playlists');
        const mapped = localPlaylists.map(pl => {
          let thumbnails: any[] = [];
          if (pl.tracks && pl.tracks.length > 0 && pl.tracks[0].poster) {
              thumbnails = [{ url: pl.tracks[0].poster }];
          }
          return {
            playlistId: pl.id,
            title: pl.title,
            description: pl.description,
            count: `${pl.tracks.length} songs`,
            thumbnails
          };
        });
        setPlaylists(mapped);
      } catch (localErr) {
        console.error("Failed to load local playlists", localErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!playlistToDelete) return;
    setIsDeleting(true);
    try {
      if (isLocal) {
        await invoke('remove_local_playlist', { id: playlistToDelete.id });
      } else {
        const res = await fetch(`${getBaseUrl()}/library/playlists/${playlistToDelete.id}`, {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete playlist.");
      }
      setPlaylists(prev => prev.filter(p => p.playlistId !== playlistToDelete.id));
      setPlaylistToDelete(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

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
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-white tracking-tight">
            {isLocal ? "Local Playlists" : "Your Playlists"}
          </h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Create Playlist
          </button>
        </div>

        {isLoading ? (
          <div className="text-white/50 text-center">Loading playlists...</div>
        ) : playlists.length === 0 ? (
          <div className="text-white/50 text-center">No playlists found.</div>
        ) : (
          <div className="album-card-grid">
            {playlists.map((playlist: any) => {
              const poster = getPosterUrl(playlist);
              return (
                <div 
                  key={playlist.playlistId} 
                  className="album-vinyl-card relative group cursor-pointer" 
                  onClick={() => navigate(`/album/${playlist.playlistId}`)}
                >
                  {playlist.playlistId !== "SE" && playlist.playlistId !== "LM" && (
                    <button 
                      className="absolute top-2 right-2 z-30 p-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlaylistToDelete({ id: playlist.playlistId, title: playlist.title });
                      }}
                      title="Delete Playlist"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  )}
                  <div className="album-vinyl-wrapper">
                    <div className="album-vinyl-disc">
                      <div className="album-vinyl-groove album-vinyl-groove-1"></div>
                      <div className="album-vinyl-groove album-vinyl-groove-2"></div>
                      <div className="album-vinyl-groove album-vinyl-groove-3"></div>
                      <div className="album-vinyl-label">
                        {poster ? (
                          <img src={poster} alt="label" />
                        ) : (
                          <div className="w-full h-full bg-[#F26B50]"></div>
                        )}
                        <div className="album-vinyl-hole"></div>
                      </div>
                    </div>
                    <div className="album-vinyl-sleeve">
                      {poster ? (
                        <img src={poster} alt={playlist.title} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black/40">
                          <svg className="w-12 h-12 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                          </svg>
                        </div>
                      )}
                      <div className="album-sleeve-gloss"></div>
                    </div>
                  </div>
                  <p className="album-card-title">{playlist.title}</p>
                  <p className="album-card-subtitle">{playlist.count || "Playlist"}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreatePlaylistModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        isLocalMode={isLocal}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchPlaylists();
        }}
      />

      {/* Delete Confirmation Modal */}
      {playlistToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in duration-200" onClick={() => setPlaylistToDelete(null)}>
          <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Delete Playlist?</h3>
            <p className="text-white/60 mb-6 text-sm">
              Are you sure you want to delete "{playlistToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                className="px-5 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
                onClick={() => setPlaylistToDelete(null)}
              >
                Cancel
              </button>
              <button 
                className="px-5 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors text-sm font-bold shadow-lg shadow-red-500/20 disabled:opacity-50"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
