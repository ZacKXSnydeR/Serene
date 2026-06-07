import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { getBaseUrl } from '../api/client';

export interface LocalTrack {
  video_id: string;
  title: string;
  artist: string;
  poster: string;
}

export interface LocalPlaylist {
  id: string;
  title: string;
  description: string;
  privacy_status: string;
  tracks: LocalTrack[];
}

interface LibraryState {
  recentlyPlayed: any[];
  
  // Actions
  initLibrary: () => void;
  addRecentlyPlayed: (track: any) => void;
  toggleLike: (track: any, currentLikeState: boolean) => Promise<boolean>;
  checkIfLiked: (videoId: string) => Promise<boolean>;
  
  // Sync logic
  syncLocalDataToYouTube: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  recentlyPlayed: [],

  initLibrary: () => {
    const stored = localStorage.getItem("recently_played");
    if (stored) {
      try {
        set({ recentlyPlayed: JSON.parse(stored) });
      } catch (e) {
        console.error("Failed to parse recently played tracks:", e);
      }
    }
  },

  addRecentlyPlayed: (track) => set((state) => {
    const filtered = state.recentlyPlayed.filter((t) => t.id !== track.id);
    const updated = [track, ...filtered].slice(0, 4);
    localStorage.setItem("recently_played", JSON.stringify(updated));

    // Clean up cached positions not in the top 4
    const activeIds = updated.map(t => String(t.id));
    const positionsStored = localStorage.getItem("recently_played_positions");
    if (positionsStored) {
      try {
        const positions = JSON.parse(positionsStored);
        const cleanedPositions: Record<string, number> = {};
        activeIds.forEach(id => {
          if (positions[id] !== undefined) {
            cleanedPositions[id] = positions[id];
          }
        });
        localStorage.setItem("recently_played_positions", JSON.stringify(cleanedPositions));
      } catch (e) {
        console.error("Failed to clean positions cache:", e);
      }
    }
    
    // Also save to native local history
    invoke('add_local_history', {
      track: {
        video_id: track.id,
        title: track.title || "Unknown Title",
        artist: track.artist || "Unknown Artist",
        poster: track.poster || ""
      }
    }).catch(console.error);
    
    return { recentlyPlayed: updated };
  }),

  checkIfLiked: async (videoId: string) => {
    try {
      const res = await fetch(`${getBaseUrl()}/song/${videoId}`);
      if (!res.ok) throw new Error("Auth Failed");
      const data = await res.json();
      return data.likeStatus === "LIKE";
    } catch (e) {
      // Fallback: Check local db
      try {
        const localLikedSongs: LocalTrack[] = await invoke('get_local_liked_songs');
        return localLikedSongs.some(t => t.video_id === videoId);
      } catch (localErr) {
        return false;
      }
    }
  },

  toggleLike: async (track: any, currentLikeState: boolean) => {
    const newState = !currentLikeState;
    const rating = newState ? 'LIKE' : 'INDIFFERENT';
    
    try {
      const res = await fetch(`${getBaseUrl()}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: track.id, rating })
      });
      if (!res.ok) throw new Error("Backend failed");
      return newState;
    } catch (e) {
      // Fallback to local
      try {
        if (newState) {
          await invoke('add_local_liked_song', {
            track: {
              video_id: track.id,
              title: track.title || "Unknown Title",
              artist: track.artist || "Unknown Artist",
              poster: track.poster || ""
            }
          });
        } else {
          await invoke('remove_local_liked_song', { videoId: track.id });
        }
        return newState;
      } catch (localErr) {
        console.error("Failed to toggle local like", localErr);
        return currentLikeState;
      }
    }
  },

  syncLocalDataToYouTube: async () => {
    try {
      // 1. Sync History
      const localHistory: LocalTrack[] = await invoke('get_local_history');
      let failedHistory = false;
      for (const track of localHistory) {
        try {
          const res = await fetch(`${getBaseUrl()}/history/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song: track.video_id })
          });
          if (!res.ok) throw new Error("Failed to add history");
        } catch (e) {
          console.error("Failed to sync history item", track.video_id, e);
          failedHistory = true;
        }
      }
      if (localHistory.length > 0 && !failedHistory) await invoke('clear_local_history');

      // 2. Sync Liked Songs
      const localLikedSongs: LocalTrack[] = await invoke('get_local_liked_songs');
      let failedLiked = false;
      for (const track of localLikedSongs) {
        try {
          const res = await fetch(`${getBaseUrl()}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: track.video_id, rating: 'LIKE' })
          });
          if (!res.ok) throw new Error("Failed to rate");
        } catch (e) {
          console.error("Failed to sync liked song", track.video_id, e);
          failedLiked = true;
        }
      }
      if (localLikedSongs.length > 0 && !failedLiked) await invoke('clear_local_liked_songs');

      // 3. Sync Playlists
      const localPlaylists: LocalPlaylist[] = await invoke('get_local_playlists');
      let failedPlaylists = false;
      for (const pl of localPlaylists) {
        try {
          const res = await fetch(`${getBaseUrl()}/library/playlists/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: pl.title,
              description: pl.description || "",
              privacy_status: pl.privacy_status,
              video_ids: pl.tracks.map(t => t.video_id)
            })
          });
          if (!res.ok) throw new Error("Failed to create remote playlist");
        } catch (e) {
          console.error("Failed to sync playlist", pl.title, e);
          failedPlaylists = true;
        }
      }
      if (localPlaylists.length > 0 && !failedPlaylists) {
        await invoke('clear_local_playlists');
      }

      console.log("Local sync complete.");
    } catch (e) {
      console.error("Sync error:", e);
    }
  }
}));
