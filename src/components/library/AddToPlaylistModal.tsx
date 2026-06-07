import { useState, useEffect } from "react";
import "./createplaylistmodal.css";
import { getBaseUrl } from "../../api/client";

import { invoke } from "@tauri-apps/api/core";
import { getPosterUrl, getHighResImage } from "../../utils/imageUtils";

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: any | null;
}

export function AddToPlaylistModal({ isOpen, onClose, track }: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
      setSelectedPlaylists([]);
      setIsCreatingNew(false);
      setNewPlaylistName("");
    }
  }, [isOpen]);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    setIsLocalMode(false);
    try {
      const res = await fetch(`${getBaseUrl()}/library/playlists?limit=50`);
      if (!res.ok) throw new Error("Failed to fetch playlists.");
      const data = await res.json();
      // Filter out only "Liked Music" (LM) because it's an auto playlist
      setPlaylists(data.filter((p: any) => p.playlistId !== "LM"));
    } catch (err: any) {
      setIsLocalMode(true);
      try {
        const localPlaylists = await invoke<any[]>('get_local_playlists');
        const mapped = localPlaylists.map(pl => ({
          playlistId: pl.id,
          title: pl.title,
          description: pl.description,
          count: pl.tracks.length
        }));
        setPlaylists(mapped);
      } catch (localErr) {
        setError("Could not load local playlists.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (playlistId: string) => {
    setSelectedPlaylists(prev => 
      prev.includes(playlistId) 
        ? prev.filter(id => id !== playlistId)
        : [...prev, playlistId]
    );
  };

  const handleAddMultiple = async () => {
    if (!track || selectedPlaylists.length === 0) return;
    const videoId = track.id || track.videoId;
    if (!videoId) return;

    setIsAdding(true);
    setError(null);
    try {
      if (isLocalMode) {
        const localTrack = {
          video_id: videoId,
          title: track.title || "Unknown Title",
          artist: track.artist || "Unknown Artist",
          poster: getPosterUrl(track) || getHighResImage(track.poster) || ""
        };
        await Promise.all(selectedPlaylists.map(playlistId => 
          invoke('add_to_local_playlist', { playlistId, tracks: [localTrack] })
        ));
      } else {
        await Promise.all(selectedPlaylists.map(playlistId => 
          fetch(`${getBaseUrl()}/library/playlists/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playlistId, videoIds: [videoId] })
          }).then(async (res) => {
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.detail || "Failed to add to playlist.");
            }
          })
        ));
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add track");
    } finally {
      setIsAdding(false);
    }
  };

  const handleCreateNew = async () => {
    if (!newPlaylistName.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      let createdPlaylistId = "";
      if (isLocalMode) {
        createdPlaylistId = await invoke('create_local_playlist', {
          title: newPlaylistName,
          description: "",
          privacyStatus: "PRIVATE"
        });
      } else {
        const res = await fetch(`${getBaseUrl()}/library/playlists/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newPlaylistName,
            description: "",
            privacy_status: "PRIVATE",
            videoIds: []
          })
        });
        if (!res.ok) throw new Error("Failed to create playlist");
        const data = await res.json();
        createdPlaylistId = data.playlistId;
      }
      
      // Select the newly created playlist automatically
      await fetchPlaylists();
      setSelectedPlaylists(prev => [...prev, createdPlaylistId]);
      
      setIsCreatingNew(false);
      setNewPlaylistName("");
    } catch (err: any) {
      setError(err.message || "Failed to create playlist");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="create-playlist-overlay" onClick={onClose}>
      <div className="create-playlist-modal" onClick={e => e.stopPropagation()}>
        <h2>Add to Playlist</h2>
        {error && <div className="form-error">{error}</div>}
        
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 mb-4 scrollbar-thin scrollbar-thumb-white/20">
          {isLoading && playlists.length === 0 ? (
            <div className="text-white/50 text-center py-4">Loading playlists...</div>
          ) : (
            <>
              {isCreatingNew ? (
                <div className="flex items-center gap-2 w-full mb-2">
                  <input 
                    type="text" 
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="New Playlist Name"
                    className="flex-1 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F26B50] transition-colors"
                    autoFocus
                  />
                  <button 
                    onClick={handleCreateNew}
                    disabled={isLoading || !newPlaylistName.trim()}
                    className="px-4 py-3 bg-[#F26B50] text-white rounded-xl font-medium hover:bg-[#ff7d63] transition-colors disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button 
                    onClick={() => setIsCreatingNew(false)}
                    className="p-3 text-white/50 hover:text-white transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ) : (
                <button 
                  className="w-full text-center px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white border border-dashed border-white/20 hover:border-white/40 font-medium mb-2"
                  onClick={() => setIsCreatingNew(true)}
                >
                  + Create New Playlist
                </button>
              )}

              {playlists.length === 0 && !isLoading && !isCreatingNew && (
                <div className="text-white/50 text-center py-4">No custom playlists found.</div>
              )}

              {playlists.map((p, idx) => {
                const isSelected = selectedPlaylists.includes(p.playlistId);
                return (
                  <button 
                    key={idx}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between border ${
                      isSelected 
                        ? "bg-[#F26B50]/20 border-[#F26B50] text-white" 
                        : "bg-white/5 border-transparent hover:bg-white/10 text-white/90"
                    }`}
                    onClick={() => toggleSelection(p.playlistId)}
                    disabled={isLoading || isAdding}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? "bg-[#F26B50] border-[#F26B50]" : "border-white/30"
                      }`}>
                        {isSelected && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </div>
                      <span className="truncate font-medium">{p.title}</span>
                    </div>
                    <span className="text-xs opacity-60 ml-2 whitespace-nowrap">{p.count || 0} tracks</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
        
        <div className="modal-actions mt-4 flex justify-end gap-3">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={isAdding}>Cancel</button>
          <button 
            type="button" 
            className="btn-submit"
            onClick={handleAddMultiple}
            disabled={selectedPlaylists.length === 0 || isAdding || isLoading}
          >
            {isAdding ? "Adding..." : `Add to ${selectedPlaylists.length} playlist${selectedPlaylists.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
