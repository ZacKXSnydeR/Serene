import { useState, useEffect } from "react";
import "./libraryviews.css";
import "../artist/artistpage.css";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { getPosterUrl } from "../../utils/imageUtils";

export function PlaylistsView({ onPlaylistSelect }: any) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<{id: string, title: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://127.0.0.1:5050/library/playlists?limit=50`);
      if (!res.ok) throw new Error("Failed to fetch playlists.");
      const data = await res.json();
      
      // Filter out only "Liked Music" (LM) because we have a dedicated Liked Songs page.
      // We will keep "Episodes for Later" (SE) as requested by the user.
      const customPlaylists = data.filter((p: any) => p.playlistId !== "LM");
      setPlaylists(customPlaylists);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!playlistToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`http://127.0.0.1:5050/library/playlists/${playlistToDelete.id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete playlist.");
      
      // Optimistically remove from UI without reloading everything
      setPlaylists(prev => prev.filter(p => p.playlistId !== playlistToDelete.id));
      setPlaylistToDelete(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  return (
    <div className="w-full flex flex-col items-center pb-24">
      <div className="w-full px-8 mt-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white tracking-wide">Your Playlists</h2>
          <button 
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all font-medium"
            onClick={() => setIsModalOpen(true)}
          >
            + Create Playlist
          </button>
        </div>

        {error && <div className="text-red-400 text-center">{error}</div>}

        {isLoading ? (
          <div className="text-white/60">Loading playlists...</div>
        ) : (
          <div className="album-card-grid mt-4">
            {playlists.map((playlist, idx) => {
              const poster = getPosterUrl(playlist);
                
              return (
                <div 
                  key={idx} 
                  className="album-vinyl-card cursor-pointer group relative"
                  onClick={() => onPlaylistSelect(playlist)}
                >
                  {playlist.playlistId !== "SE" && (
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
                    {/* Vinyl Disc */}
                    <div className="album-vinyl-disc">
                      <div className="album-vinyl-groove album-vinyl-groove-1"></div>
                      <div className="album-vinyl-groove album-vinyl-groove-2"></div>
                      <div className="album-vinyl-groove album-vinyl-groove-3"></div>
                      <div className="album-vinyl-label">
                        {poster ? <img src={poster} alt="label" /> : <div className="w-full h-full bg-[#1e1e1e]" />}
                        <div className="album-vinyl-hole"></div>
                      </div>
                    </div>
                    {/* Sleeve */}
                    <div className="album-vinyl-sleeve bg-[#282828] flex items-center justify-center">
                      {poster ? (
                        <img src={poster} alt={playlist.title} />
                      ) : (
                        <div className="text-4xl text-white/50">🎵</div>
                      )}
                      <div className="album-sleeve-gloss"></div>
                    </div>
                  </div>
                  <p className="album-card-title">{playlist.title}</p>
                  <p className="album-card-subtitle">{playlist.description || "Playlist"}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                className="px-5 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm"
                onClick={() => setPlaylistToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors flex items-center justify-center min-w-[80px]"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreatePlaylistModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newPlaylist) => {
          if (newPlaylist) {
            setPlaylists(prev => [newPlaylist, ...prev]);
          } else {
            fetchPlaylists();
          }
        }}
      />
    </div>
  );
}
