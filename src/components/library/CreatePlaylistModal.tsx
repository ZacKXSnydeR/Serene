import { useState } from "react";
import "./createplaylistmodal.css";

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPlaylist?: any) => void;
}

export function CreatePlaylistModal({ isOpen, onClose, onSuccess }: CreatePlaylistModalProps) {
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
      const res = await fetch("http://127.0.0.1:5050/library/playlists/create", {
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
