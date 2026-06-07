import { useState } from "react";
import "./createplaylistmodal.css";
import { getBaseUrl } from "../../api/client";
import { invoke } from "@tauri-apps/api/core";

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPlaylist?: any) => void;
  isLocalMode?: boolean;
}

export function CreatePlaylistModal({ isOpen, onClose, onSuccess, isLocalMode = false }: CreatePlaylistModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("PRIVATE");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      if (isLocalMode) {
        const id = await invoke<string>('create_local_playlist', {
          title,
          description,
          privacyStatus: privacy
        });
        
        onSuccess({
          playlistId: id,
          title: title,
          thumbnails: []
        });
      } else {
        const res = await fetch(`${getBaseUrl()}/library/playlists/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            privacy_status: privacy,
            video_ids: []
          })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to create playlist");
        
        onSuccess({
          playlistId: data.playlistId,
          title: title,
          thumbnails: []
        });
      }
      onClose();
      setTitle("");
      setDescription("");
      setPrivacy("PRIVATE");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-playlist-overlay" onClick={onClose}>
      <div className="create-playlist-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Playlist</h2>
        
        {isLocalMode && (
          <div className="bg-[#F26B50]/10 border border-[#F26B50]/20 rounded-lg p-3 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-[#F26B50] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[#F26B50] text-sm leading-relaxed">
              This playlist will stay locally on your PC. To back it up and sync it across devices, please log in with YouTube Music later.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="My Awesome Playlist"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Privacy</label>
            <div className="privacy-tabs">
              <button 
                type="button"
                className={`privacy-tab ${privacy === "PRIVATE" ? "active" : ""}`}
                onClick={() => setPrivacy("PRIVATE")}
              >
                Private
              </button>
              <button 
                type="button"
                className={`privacy-tab ${privacy === "UNLISTED" ? "active" : ""}`}
                onClick={() => setPrivacy("UNLISTED")}
              >
                Unlisted
              </button>
              <button 
                type="button"
                className={`privacy-tab ${privacy === "PUBLIC" ? "active" : ""}`}
                onClick={() => setPrivacy("PUBLIC")}
              >
                Public
              </button>
            </div>
          </div>
          
          {error && <div className="form-error">{error}</div>}
          
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={isLoading || !title.trim()}>
              {isLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
