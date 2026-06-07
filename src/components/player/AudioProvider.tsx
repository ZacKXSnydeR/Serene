import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useStreamUrl, useAddHistory } from '../../api/queries';

export const AudioProvider: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentTimeRef = useRef(0);
  const pendingSeekTimeRef = useRef<number | null>(null);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const volume = usePlayerStore((state) => state.volume);
  const currentTime = usePlayerStore((state) => state.currentTime);
  
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const playNext = usePlayerStore((state) => state.playNext);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  
  const addRecentlyPlayed = useLibraryStore((state) => state.addRecentlyPlayed);

  const { data: streamData } = useStreamUrl(currentTrack?.id || null);
  const { mutate: addHistory } = useAddHistory();

  // Handle new track selection
  useEffect(() => {
    if (currentTrack) {
      // Add to recently played and history
      addRecentlyPlayed(currentTrack);
      addHistory(currentTrack.id);

      // Check for cached position
      try {
        const stored = localStorage.getItem("recently_played_positions");
        if (stored) {
          const positions = JSON.parse(stored);
          const cachedTime = positions[String(currentTrack.id)];
          if (cachedTime !== undefined && typeof cachedTime === 'number') {
            pendingSeekTimeRef.current = cachedTime;
          }
        }
      } catch (e) {
        console.error("Failed to read cached position:", e);
      }
    }
  }, [currentTrack?.id, addRecentlyPlayed, addHistory]);

  // Handle Stream URL fetch success
  useEffect(() => {
    if (streamData?.url && audioRef.current) {
      audioRef.current.src = streamData.url;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Playback failed:", err);
        setIsPlaying(false);
      });
    }
  }, [streamData?.url, setIsPlaying]);

  // Sync external volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.pow(volume / 100, 2);
    }
  }, [volume]);

  // Sync play/pause from external UI changes
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && audioRef.current.paused && audioRef.current.src) {
        audioRef.current.play().catch(console.error);
      } else if (!isPlaying && !audioRef.current.paused) {
        audioRef.current.pause();
        savePosition(audioRef.current.currentTime);
      }
    }
  }, [isPlaying]);

  // Allow external seeks
  useEffect(() => {
    if (audioRef.current) {
      // Only seek if the difference is larger than 1 second to avoid loops
      if (Math.abs(audioRef.current.currentTime - currentTime) > 1) {
        audioRef.current.currentTime = currentTime;
        savePosition(currentTime);
      }
    }
  }, [currentTime]);

  const savePosition = (time: number) => {
    if (!currentTrack) return;
    const trackId = String(currentTrack.id);
    try {
      const stored = localStorage.getItem("recently_played_positions");
      const positions = stored ? JSON.parse(stored) : {};
      positions[trackId] = time;
      localStorage.setItem("recently_played_positions", JSON.stringify(positions));
    } catch (e) {
      console.error("Failed to save track position:", e);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      
      if (Math.floor(time) !== Math.floor(currentTimeRef.current)) {
        currentTimeRef.current = time;
        savePosition(time);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      if (pendingSeekTimeRef.current !== null) {
        audioRef.current.currentTime = pendingSeekTimeRef.current;
        setCurrentTime(pendingSeekTimeRef.current);
        pendingSeekTimeRef.current = null;
      }
    }
  };

  const handleEnded = () => {
    savePosition(0); // Reset position
    if (repeatMode === 'track') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
    } else {
      playNext();
    }
  };

  // Window unload save
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (audioRef.current && currentTrack) {
        savePosition(audioRef.current.currentTime);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentTrack]);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onDurationChange={handleLoadedMetadata}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
      className="hidden"
    />
  );
};
