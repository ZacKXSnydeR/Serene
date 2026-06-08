import { create } from 'zustand';
import { getBaseUrl } from '../api/client';
import { getPosterUrl } from '../utils/imageUtils';

import { useUIStore } from './useUIStore';

interface PlayerState {
  currentTrack: any | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: "off" | "all" | "track";
  isShuffleOn: boolean;
  queue: any[]; // The active playback queue
  originalQueue: any[]; // The unaltered context queue
  activePlaylistId: string | null;
  isFetchingNextPage: boolean;
  
  // Actions
  setCurrentTrack: (track: any) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setRepeatMode: (mode: "off" | "all" | "track") => void;
  toggleShuffle: () => void;
  setQueue: (tracks: any[]) => void;
  playPlaylist: (tracks: any[], startIndex?: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  fetchAndPlayWatchQueue: (track: any) => Promise<void>;
  fetchNextQueueBatch: () => Promise<void>;
}

// Fisher-Yates shuffle
const shuffleArray = (array: any[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 70,
  repeatMode: "off",
  isShuffleOn: false,
  queue: [],
  originalQueue: [],
  activePlaylistId: null,
  isFetchingNextPage: false,

  setCurrentTrack: (track) => {
    set({ currentTrack: track, isPlaying: true });
    useUIStore.getState().setIsNowPlayingOpen(true);
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setRepeatMode: (repeatMode) => set({ repeatMode }),
  
  toggleShuffle: () => {
    const { isShuffleOn, originalQueue, currentTrack } = get();
    const newShuffleState = !isShuffleOn;
    
    if (newShuffleState) {
      // Turn ON shuffle: keep current track first, shuffle the rest
      if (currentTrack) {
        const remaining = originalQueue.filter(t => t.id !== currentTrack.id);
        set({ isShuffleOn: newShuffleState, queue: [currentTrack, ...shuffleArray(remaining)] });
      } else {
        set({ isShuffleOn: newShuffleState, queue: shuffleArray(originalQueue) });
      }
    } else {
      // Turn OFF shuffle: restore original queue
      set({ isShuffleOn: newShuffleState, queue: [...originalQueue] });
    }
  },

  setQueue: (tracks) => {
    const { isShuffleOn, currentTrack } = get();
    if (isShuffleOn) {
      if (currentTrack && tracks.some(t => t.id === currentTrack.id)) {
        const remaining = tracks.filter(t => t.id !== currentTrack.id);
        set({ originalQueue: tracks, queue: [currentTrack, ...shuffleArray(remaining)] });
      } else {
        set({ originalQueue: tracks, queue: shuffleArray(tracks) });
      }
    } else {
      set({ originalQueue: tracks, queue: tracks });
    }
  },

  playPlaylist: (tracks, startIndex = 0) => {
    if (!tracks || tracks.length === 0) return;
    const trackToPlay = tracks[startIndex] || tracks[0];
    
    // Set current track and clear activePlaylistId so radio recommendations stop
    set({ currentTrack: trackToPlay, isPlaying: true, activePlaylistId: null });
    useUIStore.getState().setIsNowPlayingOpen(true);
    
    // Delegate to setQueue which will now correctly place currentTrack at index 0 if shuffled
    get().setQueue(tracks);
  },

  fetchAndPlayWatchQueue: async (track: any) => {
    // Start playing the clicked track immediately
    set({ currentTrack: track, isPlaying: true, queue: [track], originalQueue: [track] });
    useUIStore.getState().setIsNowPlayingOpen(true);
    
    try {
      const res = await fetch(`${getBaseUrl()}/watch/${track.id}`);
      if (!res.ok) throw new Error("Failed to fetch watch playlist");
      const data = await res.json();
      
      if (data.tracks && data.tracks.length > 0) {
        const mappedTracks = data.tracks.map((item: any) => ({
          id: item.videoId || item.id,
          title: item.title,
          artist: item.artists?.[0]?.name || "Unknown Artist",
          artistId: item.artists?.[0]?.id,
          album: item.album?.name || "Unknown Album",
          poster: getPosterUrl(item),
          source: "youtube"
        }));
        
        // Use setQueue to apply shuffle state properly
        set({ activePlaylistId: data.playlistId || null });
        get().setQueue(mappedTracks);
      }
    } catch (err) {
      console.error("Failed to fetch watch queue:", err);
    }
  },

  fetchNextQueueBatch: async () => {
    const { activePlaylistId, originalQueue, isFetchingNextPage } = get();
    if (!activePlaylistId || isFetchingNextPage || originalQueue.length === 0) return;
    
    set({ isFetchingNextPage: true });
    try {
      const lastTrack = originalQueue[originalQueue.length - 1];
      const res = await fetch(`${getBaseUrl()}/watch/${lastTrack.id}?playlistId=${activePlaylistId}`);
      if (!res.ok) throw new Error("Failed to fetch next watch playlist batch");
      const data = await res.json();
      
      if (data.tracks && data.tracks.length > 0) {
        const mappedTracks = data.tracks.map((item: any) => ({
          id: item.videoId || item.id,
          title: item.title,
          artist: item.artists?.[0]?.name || "Unknown Artist",
          artistId: item.artists?.[0]?.id,
          album: item.album?.name || "Unknown Album",
          poster: getPosterUrl(item),
          source: "youtube"
        }));
        
        const existingIds = new Set(originalQueue.map(t => t.id));
        const newTracks = mappedTracks.filter((t: any) => !existingIds.has(t.id));
        
        if (newTracks.length > 0) {
          const { isShuffleOn, queue } = get();
          const newOriginalQueue = [...originalQueue, ...newTracks];
          
          let newQueue;
          if (isShuffleOn) {
             newQueue = [...queue, ...shuffleArray(newTracks)];
          } else {
             newQueue = [...queue, ...newTracks];
          }
          
          set({ originalQueue: newOriginalQueue, queue: newQueue });
        }
      }
    } catch (err) {
      console.error("Failed to fetch next queue batch:", err);
    } finally {
      set({ isFetchingNextPage: false });
    }
  },
  
  playNext: () => {
    const { currentTrack, queue, repeatMode } = get();
    if (!currentTrack || queue.length === 0) return;
    
    const currentIndex = queue.findIndex((t: any) => t.id === currentTrack.id);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex + 1;
    
    // Auto-fetch next batch if we are near the end
    if (nextIndex >= queue.length - 5) {
      get().fetchNextQueueBatch();
    }

    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        set({ isPlaying: false });
        return;
      }
    }
    set({ currentTrack: queue[nextIndex], isPlaying: true });
  },

  playPrevious: () => {
    const { currentTrack, queue, repeatMode, currentTime } = get();
    if (!currentTrack || queue.length === 0) return;
    
    // If we are more than 3 seconds in, just restart the track
    if (currentTime > 3) {
      set({ currentTime: 0 }); 
      return;
    }

    const currentIndex = queue.findIndex((t: any) => t.id === currentTrack.id);
    if (currentIndex === -1) return;

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = queue.length - 1;
      } else {
        set({ currentTime: 0 });
        return;
      }
    }
    set({ currentTrack: queue[prevIndex], isPlaying: true });
  }
}));
