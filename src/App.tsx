import { useState, useEffect, useRef } from "react";
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { invoke } from "@tauri-apps/api/core";
import { Sidebar } from "./components/layout/Sidebar";
import { SearchBar } from "./components/layout/SearchBar";
import { TrackGrid } from "./components/home/TrackGrid";
import { RecentlyPlayed } from "./components/home/RecentlyPlayed";
import { Playbar } from "./components/player/Playbar";
import { NowPlayingSidebar } from "./components/player/NowPlayingSidebar";
import { Coverflow } from "./components/home/Coverflow";
import { PlayerFullscreen } from "./components/player/PlayerFullscreen";
import { searchYouTube, extractAudioUrl } from "./services/youtube";
import ArtistPage from "./components/artist/ArtistPage";
import AlbumPage from "./components/album/AlbumPage";
import TopArtistCard from "./components/search/TopArtistCard";

const appWindow = getCurrentWindow();

export default function App() {
  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [activeNav, setActiveNav] = useState("home");
  const [isHoveringTop, setIsHoveringTop] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Custom Page states
  const [activeArtistId, setActiveArtistId] = useState<string | null>(null);
  const [activeAlbumData, setActiveAlbumData] = useState<{ id: string, title: string, artist: string, thumbnail: string } | null>(null);

  // Deezer global chart data states
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [topPlaylists, setTopPlaylists] = useState<any[]>([]);

  // Session cache states for homepage
  const [defaultTracks, setDefaultTracks] = useState<any[]>([]);
  const [defaultArtists, setDefaultArtists] = useState<any[]>([]);
  const [defaultPlaylists, setDefaultPlaylists] = useState<any[]>([]);
  

  // Dynamic Music Playback & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<any[]>([]);
  const [searchArtists, setSearchArtists] = useState<any[]>([]);
  const [searchPlaylists, setSearchPlaylists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "track">("off");
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isExitingFs, setIsExitingFs] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const currentTimeRef = useRef(0);
  const recentlyPlayedRef = useRef<any[]>([]);

  // Helper to identify if an image/poster URL is a default placeholder
  const isPlaceholderImage = (url: string | null | undefined): boolean => {
    if (!url) return true;
    const lowerUrl = url.toLowerCase();
    const placeholderSignatures = [
      "d41d8cd98f00b204e9800998ecf8427e", // Empty string MD5 placeholder hash on Deezer
      "24de8c7fa822f99f94681c3e029a25f4", // Fahmida Nabi's default avatar (silhouette) placeholder
      "placeholder",
      "empty",
      "artist//",
      "album//",
      "playlist//",
      "cover//"
    ];
    // "default" is too broad, it blocks YouTube's sddefault.jpg, hqdefault.jpg, etc.
    return placeholderSignatures.some(sig => lowerUrl.includes(sig));
  };

  // Search track handler (dual sourcing from iTunes Search API and YouTube)
  const searchTracks = async (term: string, isDefault = false) => {
    if (!term.trim()) return;
    setIsLoading(true);
    setIsSearchActive(!isDefault);
    try {
      const [itunesRes, ytRes] = await Promise.allSettled([
        fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=12`).then(res => res.json()),
        searchYouTube(term)
      ]);

      const mappedTracks: any[] = [];
      const mappedArtists: any[] = [];
      const mappedPlaylists: any[] = [];

      // Process YouTube results
      if (ytRes.status === 'fulfilled' && ytRes.value) {
        ytRes.value.forEach((item) => {
          if (!isPlaceholderImage(item.thumbnail)) {
            if (item.result_type === "artist") {
              mappedArtists.push({
                id: item.browse_id,
                title: item.title,
                image: item.thumbnail,
                subtitle: item.uploader || "Artist",
              });
            } else if (item.result_type === "playlist" || item.result_type === "album") {
              mappedPlaylists.push({
                id: item.browse_id,
                title: item.title,
                image: item.thumbnail,
                subtitle: item.uploader || "Playlist",
              });
            } else {
              mappedTracks.push({
                id: item.id,
                title: item.title,
                artist: item.uploader,
                artistId: item.uploader_id,
                album: item.result_type === "video" ? "YouTube" : "YT Music",
                poster: item.thumbnail,
                previewUrl: "", // Extracted on demand
                source: "youtube"
              });
            }
          }
        });
      }

      // Process iTunes results
      if (itunesRes.status === 'fulfilled' && itunesRes.value?.results) {
        itunesRes.value.results.forEach((item: any) => {
          const posterUrl = item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb.jpg", "600x600bb.jpg") : "";
          if (!isPlaceholderImage(posterUrl)) {
            mappedTracks.push({
              id: item.trackId,
              title: item.trackName,
              artist: item.artistName,
              album: item.collectionName,
              poster: posterUrl,
              previewUrl: item.previewUrl,
              genre: item.primaryGenreName,
              source: "itunes"
            });
          }
        });
      }

      setTracks(mappedTracks);
      setSearchArtists(mappedArtists);
      setSearchPlaylists(mappedPlaylists);
      if (mappedTracks.length > 0) {
      }
    } catch (err) {
      console.error("Failed to fetch tracks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load recently played tracks and sidebar pin state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("recently_played");
    if (stored) {
      try {
        setRecentlyPlayed(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recently played tracks:", e);
      }
    }
    const storedPin = localStorage.getItem("sidebar_pinned");
    if (storedPin === "true") {
      setIsSidebarPinned(true);
      setIsSidebarOpen(true);
    }
  }, []);

  // Sync recentlyPlayed to ref for access in unload handler
  useEffect(() => {
    recentlyPlayedRef.current = recentlyPlayed;
  }, [recentlyPlayed]);

  // Save current track playback position to localStorage (max 4 entries cached)
  const saveCurrentTrackPosition = (time: number) => {
    if (!currentTrack) return;
    const trackId = String(currentTrack.id);
    try {
      const stored = localStorage.getItem("recently_played_positions");
      const positions = stored ? JSON.parse(stored) : {};
      const isRecentlyPlayed = recentlyPlayedRef.current.some(t => String(t.id) === trackId);
      if (isRecentlyPlayed) {
        positions[trackId] = time;
        localStorage.setItem("recently_played_positions", JSON.stringify(positions));
      }
    } catch (e) {
      console.error("Failed to save track position:", e);
    }
  };

  // Window unload listener to capture latest playback progress
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (audioRef.current && currentTrack) {
        saveCurrentTrackPosition(audioRef.current.currentTime);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentTrack]);

  // Handle loaded metadata (seek to target cached position if applicable)
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      if (pendingSeekTimeRef.current !== null) {
        console.log(`Resuming playback from cached position: ${pendingSeekTimeRef.current}s`);
        audioRef.current.currentTime = pendingSeekTimeRef.current;
        setCurrentTime(pendingSeekTimeRef.current);
        pendingSeekTimeRef.current = null;
      }
    }
  };

  // Curation helper to filter out ASMR, sleep, meditation, and noise tracks
  const filterOutNonMusic = (tracksList: any[]) => {
    const bannedKeywords = [
      "asmr", "meditation", "sleep", "relaxing", "yoga", "spa", "wellness",
      "white noise", "rain", "thunderstorm", "hypnosis", "therapy", "relax",
      "nature sounds", "water sounds", "calm", "calming", "binaural", "solfeggio",
      "frequency", "healing", "soundscape", "noise", "study", "studying"
    ];
    return tracksList.filter(track => {
      const title = (track.title || "").toLowerCase();
      const artist = (track.artist || "").toLowerCase();
      const album = (track.album || "").toLowerCase();
      return !bannedKeywords.some(keyword => 
        title.includes(keyword) || 
        artist.includes(keyword) || 
        album.includes(keyword)
      );
    });
  };

  // Load Deezer global charts (Tracks, Artists, Playlists) on launch via Rust CORS Proxy
  useEffect(() => {
    const fetchDeezerCharts = async () => {
      setIsLoading(true);
      try {
        const responseText = await invoke<string>("fetch_web_data", { url: "https://api.deezer.com/chart?limit=30" });
        const chartData = JSON.parse(responseText);
        
        // Parse & Cache Top Artists (take top 10 for carousel)
        if (chartData.artists?.data) {
          const artists = chartData.artists.data
            .map((artist: any) => ({
              id: String(artist.id),
              title: artist.name,
              subtitle: "Global Top Artist",
              image: artist.picture_big || artist.picture_medium || artist.picture_small || ""
            }))
            .filter((a: any) => !isPlaceholderImage(a.image))
            .slice(0, 10);
          setTopArtists(artists);
          setDefaultArtists(artists);
        }
        
        // Parse & Cache Top Playlists (take top 10 for carousel)
        if (chartData.playlists?.data) {
          const playlists = chartData.playlists.data
            .map((playlist: any) => ({
              id: String(playlist.id),
              title: playlist.title,
              subtitle: `Curated by ${playlist.creator?.name || "Deezer"}`,
              image: playlist.picture_big || playlist.picture_medium || ""
            }))
            .filter((p: any) => !isPlaceholderImage(p.image))
            .slice(0, 10);
          setTopPlaylists(playlists);
          setDefaultPlaylists(playlists);
        }

        // Parse, Filter & Cache Top Tracks for homepage discovery grid
        if (chartData.tracks?.data) {
          const mappedTracks = chartData.tracks.data
            .map((t: any) => ({
              id: `deezer-${t.id}`,
              title: t.title,
              artist: t.artist?.name || "Unknown Artist",
              album: t.album?.title || "Deezer",
              poster: t.album?.cover_big || t.album?.cover_medium || "",
              previewUrl: t.preview,
              source: "deezer"
            }))
            .filter((t: any) => !isPlaceholderImage(t.poster));
          
          const musicOnlyTracks = filterOutNonMusic(mappedTracks);
          setTracks(musicOnlyTracks);
          setDefaultTracks(musicOnlyTracks);
          if (musicOnlyTracks.length > 0) {
            
          }
        }
      } catch (err) {
        console.error("Failed to fetch Deezer charts:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDeezerCharts();
  }, []);

  // Fetch and play artist top tracks from Deezer
  const handlePlayArtist = async (artistId: string) => {
    setIsLoading(true);
    try {
      const responseText = await invoke<string>("fetch_web_data", { url: `https://api.deezer.com/artist/${artistId}/top` });
      const tracksData = JSON.parse(responseText);
      if (tracksData.data && tracksData.data.length > 0) {
        const mappedTracks = tracksData.data
          .map((t: any) => ({
            id: `deezer-${t.id}`,
            title: t.title,
            artist: t.artist?.name || "Unknown Artist",
            album: t.album?.title || "Deezer",
            poster: t.album?.cover_big || t.album?.cover_medium || "",
            previewUrl: t.preview,
            source: "deezer"
          }))
          .filter((t: any) => !isPlaceholderImage(t.poster));

        if (mappedTracks.length > 0) {
          setTracks(mappedTracks);
          handleTrackSelect(mappedTracks[0]);
        }
      }
    } catch (err) {
      console.error("Failed to play artist tracks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch artist top tracks and load in grid without autopaying
  const handleLoadArtistTracks = async (artistId: string) => {
    setIsLoading(true);
    try {
      const responseText = await invoke<string>("fetch_web_data", { url: `https://api.deezer.com/artist/${artistId}/top` });
      const tracksData = JSON.parse(responseText);
      if (tracksData.data && tracksData.data.length > 0) {
        const mappedTracks = tracksData.data
          .map((t: any) => ({
            id: `deezer-${t.id}`,
            title: t.title,
            artist: t.artist?.name || "Unknown Artist",
            album: t.album?.title || "Deezer",
            poster: t.album?.cover_big || t.album?.cover_medium || "",
            previewUrl: t.preview,
            source: "deezer"
          }))
          .filter((t: any) => !isPlaceholderImage(t.poster));

        if (mappedTracks.length > 0) {
          setTracks(mappedTracks);
        }
      }
    } catch (err) {
      console.error("Failed to load artist tracks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch and play playlist tracks from Deezer
  const handlePlayPlaylist = async (playlistId: string) => {
    setIsLoading(true);
    try {
      const responseText = await invoke<string>("fetch_web_data", { url: `https://api.deezer.com/playlist/${playlistId}` });
      const playlistData = JSON.parse(responseText);
      if (playlistData.tracks?.data && playlistData.tracks.data.length > 0) {
        const mappedTracks = playlistData.tracks.data
          .map((t: any) => ({
            id: `deezer-${t.id}`,
            title: t.title,
            artist: t.artist?.name || "Unknown Artist",
            album: t.album?.title || "Deezer",
            poster: t.album?.cover_big || t.album?.cover_medium || "",
            previewUrl: t.preview,
            source: "deezer"
          }))
          .filter((t: any) => !isPlaceholderImage(t.poster));

        if (mappedTracks.length > 0) {
          setTracks(mappedTracks);
          handleTrackSelect(mappedTracks[0]);
        }
      }
    } catch (err) {
      console.error("Failed to play playlist tracks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch playlist tracks and load in grid without autopaying
  const handleLoadPlaylistTracks = async (playlistId: string) => {
    setIsLoading(true);
    try {
      const responseText = await invoke<string>("fetch_web_data", { url: `https://api.deezer.com/playlist/${playlistId}` });
      const playlistData = JSON.parse(responseText);
      if (playlistData.tracks?.data && playlistData.tracks.data.length > 0) {
        const mappedTracks = playlistData.tracks.data
          .map((t: any) => ({
            id: `deezer-${t.id}`,
            title: t.title,
            artist: t.artist?.name || "Unknown Artist",
            album: t.album?.title || "Deezer",
            poster: t.album?.cover_big || t.album?.cover_medium || "",
            previewUrl: t.preview,
            source: "deezer"
          }))
          .filter((t: any) => !isPlaceholderImage(t.poster));

        if (mappedTracks.length > 0) {
          setTracks(mappedTracks);
        }
      }
    } catch (err) {
      console.error("Failed to load playlist tracks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Audio elements event listeners
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      
      // Save to localStorage once per second to prevent high frequency writes
      if (Math.floor(time) !== Math.floor(currentTimeRef.current)) {
        currentTimeRef.current = time;
        saveCurrentTrackPosition(time);
      }
    }
  };

  const handleDurationChange = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    if (currentTrack) {
      saveCurrentTrackPosition(0);
    }
    if (repeatMode === 'track') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Playback replay failed:", e));
      }
    } else {
      if (tracks.length > 0 && currentTrack) {
        const currentIndex = tracks.findIndex((t: any) => t.id === currentTrack.id);
        if (currentIndex !== -1) {
          const nextIndex = currentIndex + 1;
          if (nextIndex < tracks.length) {
            handleTrackSelect(tracks[nextIndex]);
            return;
          } else if (repeatMode === 'all') {
            handleTrackSelect(tracks[0]);
            return;
          }
        }
      }
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // Playback Control Handlers
  const handlePlayAlbumQueue = (playlistTracks: any[], startIndex = 0) => {
    setTracks(playlistTracks);
    handleTrackSelect(playlistTracks[startIndex]);
  };

  const handleTrackSelect = async (track: any, resumeFromCache = false) => {
    if (!track) return;
    if (currentTrack && audioRef.current) {
      saveCurrentTrackPosition(audioRef.current.currentTime);
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsNowPlayingOpen(true); // Auto-open Now Playing sidebar when song is clicked
    
    // Retrieve cached seek position if playing from recently played
    let targetSeekTime: number | null = null;
    if (resumeFromCache) {
      try {
        const stored = localStorage.getItem("recently_played_positions");
        if (stored) {
          const positions = JSON.parse(stored);
          const cachedTime = positions[String(track.id)];
          if (cachedTime !== undefined && typeof cachedTime === 'number') {
            targetSeekTime = cachedTime;
          }
        }
      } catch (e) {
        console.error("Failed to read cached position:", e);
      }
    }
    pendingSeekTimeRef.current = targetSeekTime;

    // Add to recently played list
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
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
      return updated;
    });

    if (audioRef.current) {
      if (track.source === 'youtube') {
        try {
          if (!track.previewUrl) {
            const audioUrl = await extractAudioUrl(track.id);
            track.previewUrl = audioUrl; // Cache the extracted URL
          }
          if (!audioRef.current) return;
          audioRef.current.src = track.previewUrl;
          audioRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(err => {
            console.error("Playback failed:", err);
          });
        } catch (err) {
          console.error("YouTube playback failed:", err);
        }
      } else if (track.source === 'deezer' || track.source === 'itunes') {
        try {
          // Resolve full YouTube audio url if not cached
          if (!track.fullYtUrl) {
            console.log(`Searching YouTube for: ${track.title} ${track.artist}`);
            const ytResults = await searchYouTube(`${track.title} ${track.artist}`);
            if (ytResults && ytResults.length > 0) {
              const bestResult = ytResults.find(r => r.id && (r.result_type === 'song' || r.result_type === 'video')) || ytResults.find(r => r.id);
              if (bestResult) {
                console.log(`Extracting full audio from YouTube ID: ${bestResult.id}`);
                const fullAudioUrl = await extractAudioUrl(bestResult.id);
                track.fullYtUrl = fullAudioUrl; // Cache on track object
              } else {
                console.warn(`No playable YouTube video ID found for: ${track.title}`);
              }
            }
          }
          
          const playUrl = track.fullYtUrl || track.previewUrl;
          if (playUrl) {
            audioRef.current.src = playUrl;
            audioRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(err => {
              console.error("Playback failed:", err);
            });
          }
        } catch (err) {
          console.error("Failed to fetch full YouTube audio, falling back to preview:", err);
          if (track.previewUrl) {
            audioRef.current.src = track.previewUrl;
            audioRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(e => console.error("Preview playback failed:", e));
          }
        }
      } else {
        audioRef.current.src = track.previewUrl;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error("Playback failed:", err);
        });
      }
    }
  };

  const handleRecentlyPlayedSelect = (track: any) => {
    handleTrackSelect(track, true);
  };

  const handlePlayToggle = () => {
    if (!currentTrack) return;
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        saveCurrentTrackPosition(audioRef.current.currentTime);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error("Playback failed:", err);
        });
      }
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      saveCurrentTrackPosition(time);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = Math.pow(vol / 100, 2);
    }
  };

  // Sync volume to audio element with logarithmic mapping (human volume perception)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.pow(volume / 100, 2);
    }
  }, [currentTrack, volume]);

  const handleRepeatToggle = () => {
    setRepeatMode(prev => {
      if (prev === "off") return "all";
      if (prev === "all") return "track";
      return "off";
    });
  };

  const handleCloseFullscreen = () => {
    setIsExitingFs(true);
    setIsFullscreenOpen(false);
    setTimeout(() => {
      setIsExitingFs(false);
    }, 50);
  };

  const handleNextTrack = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex((t: any) => t.id === currentTrack.id);
    if (currentIndex === -1) return;

    if (isShuffleOn && tracks.length > 1) {
      let nextIndex = currentIndex;
      while (nextIndex === currentIndex) {
        nextIndex = Math.floor(Math.random() * tracks.length);
      }
      handleTrackSelect(tracks[nextIndex]);
      return;
    }

    let nextIndex = currentIndex + 1;
    if (nextIndex >= tracks.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return;
      }
    }
    handleTrackSelect(tracks[nextIndex]);
  };

  const handlePreviousTrack = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex((t: any) => t.id === currentTrack.id);
    if (currentIndex === -1) return;

    if (isShuffleOn && tracks.length > 1) {
      let prevIndex = currentIndex;
      while (prevIndex === currentIndex) {
        prevIndex = Math.floor(Math.random() * tracks.length);
      }
      handleTrackSelect(tracks[prevIndex]);
      return;
    }

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = tracks.length - 1;
      } else {
        handleSeek(0);
        return;
      }
    }
    handleTrackSelect(tracks[prevIndex]);
  };

  // The border color (slightly lighter gray than base color)
  const borderColor = "#2D2D2D";

  // Lenis smooth scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const contentElement = scrollContainerRef.current.firstElementChild as HTMLElement || scrollContainerRef.current;

    const lenis = new Lenis({
      wrapper: scrollContainerRef.current,
      content: contentElement,
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    const resizeObserver = new ResizeObserver(() => {
      lenis.resize();
    });
    resizeObserver.observe(contentElement);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Check initial maximized state
    appWindow.isMaximized().then(setIsMaximized).catch(() => { });

    // Global mouse tracking to unstuck the titlebar after dragging ends
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // If the left button is NOT held down, we are definitely not dragging anymore.
      if (e.buttons !== 1) {
        setIsDragging(false);
        // If the mouse is also outside the titlebar zone, hide it.
        if (e.clientY > 44) {
          setIsHoveringTop(false);
        }
      }

      // Automatically trigger Titlebar dropdown if mouse enters the very top zone (within 8px from top)
      if (e.clientY < 8) {
        setIsHoveringTop(true);
      }
    };

    let resizeTimer: number;
    const enforceAspectRatio = async () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(async () => {
        try {
          const isMax = await appWindow.isMaximized();
          if (isMax) return; // Don't enforce ratio when maximized

          const size = await appWindow.outerSize();
          const targetRatio = 16 / 9;
          const currentRatio = size.width / size.height;

          // If ratio is off by more than 1%, force it back
          if (Math.abs(currentRatio - targetRatio) > 0.01) {
            // Base new size on width to match target ratio
            const newHeight = Math.round(size.width / targetRatio);
            await appWindow.setSize(new LogicalSize(size.width, newHeight));
          }
        } catch (e) {
          // ignore
        }
      }, 300); // Larger debounce to prevent jitter while actively dragging
    };

    let unlistenResize: () => void;
    appWindow.onResized(() => {
      enforceAspectRatio();
    }).then(unlisten => {
      unlistenResize = unlisten;
    });

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      if (unlistenResize) unlistenResize();
    };
  }, []);

  const handleMaximize = async () => {
    try {
      if (isMaximized) {
        await appWindow.unmaximize();
        setIsMaximized(false);
      } else {
        await appWindow.maximize();
        setIsMaximized(true);
      }
    } catch (e) {
      console.error("Maximize failed:", e);
    }
  };

  return (
    <main
      className="w-screen h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundColor: borderColor,
        padding: "6px",
        paddingTop: isHoveringTop ? "44px" : "6px",
        transition: "padding-top 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      <style>{`
        /* Globally remove scrollbars and force Plus Jakarta Sans as the default font */
        * {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        ::-webkit-scrollbar {
          display: none;
        }

        /* Background noise overlay optimization - static layout for 0% CPU overhead */
        .noise-overlay {
          pointer-events: none;
        }
      `}</style>

      {/* 
        Titlebar Area
        When closed, it's shifted up completely, leaving no bar visible!
      */}
      <div
        className={`absolute top-0 left-0 right-0 h-[44px] flex items-center justify-between pl-5 pr-3 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isHoveringTop ? 'translate-y-0' : '-translate-y-full'}`}
        data-tauri-drag-region
        onMouseEnter={() => setIsHoveringTop(true)}
        onMouseLeave={() => {
          // Only close if we are NOT dragging!
          if (!isDragging) setIsHoveringTop(false);
        }}
        onMouseDown={(e) => {
          // If left click, mark as dragging!
          if (e.button === 0) setIsDragging(true);
        }}
        onDoubleClick={handleMaximize}
      >
        {/* Brand Text placed in Titlebar top-left with premium typography */}
        <div
          className="flex-1 h-full flex items-center cursor-default"
          data-tauri-drag-region
          onDoubleClick={handleMaximize}
        >
          <span 
            className="text-[11px] text-white/50 font-medium tracking-[0.45em] select-none pointer-events-none mt-[2px] uppercase"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            SERENE
          </span>
        </div>

        {/* Custom Minimalist Windows-like Controls */}
        <div className="flex items-center space-x-1 z-50">
          <button
            onClick={() => appWindow.minimize()}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-white/30 hover:text-white/90 hover:bg-white/10 transition-all duration-200"
          >
            <svg className="pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="6" x2="10" y2="6" />
            </svg>
          </button>

          <button
            onClick={handleMaximize}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-white/30 hover:text-white/90 hover:bg-white/10 transition-all duration-200"
          >
            {isMaximized ? (
              // Restore Down Icon
              <svg className="pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                <path d="M3 5v4a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1z" />
                <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H9" />
              </svg>
            ) : (
              // Maximize Icon
              <svg className="pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                <rect x="2" y="2" width="8" height="8" rx="1.5" />
              </svg>
            )}
          </button>

          <button
            onClick={() => appWindow.close()}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-white/30 hover:text-white hover:bg-[#E81123] transition-all duration-200"
          >
            <svg className="pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="3" x2="9" y2="9" />
              <line x1="3" y1="9" x2="9" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* 
        Inner rounded container with the fluid layered diagonal wave background
      */}
      <div
        className={`flex-1 rounded-2xl relative flex flex-col overflow-hidden w-full h-full shadow-inner ${isExitingFs ? 'no-transitions' : ''}`}
        style={{ backgroundColor: "#070707" }}
      >
        {/* Elegant Logo fixed at top-left of the inner container */}
        <div className={`absolute top-6 left-6 z-40 select-none pointer-events-none ${
          isFullscreenOpen 
            ? 'opacity-0 pointer-events-none transition-opacity duration-300' 
            : 'opacity-100'
        }`}>
          <img 
            src="/SerenLogo.png" 
            className="h-13 w-auto object-contain" 
            alt="Serene Logo" 
          />
        </div>

        {/* UI Overlays */}
        <div 
          className="absolute top-0 left-0 w-8 h-full z-45 cursor-none"
          onMouseEnter={() => setIsSidebarOpen(true)}
        />

        <Sidebar
          isOpen={!isFullscreenOpen && (isSidebarOpen || isSidebarPinned)}
          onClose={() => {
            if (!isSidebarPinned) setIsSidebarOpen(false);
          }}
          activeNav={activeNav}
          setActiveNav={(id) => {
            setActiveNav(id);
            if (id === "home") {
              setIsSearchActive(false);
              setSearchQuery("");
              // Restore cached homepage charts from state instantly
              setTracks(defaultTracks);
              setTopArtists(defaultArtists);
              setTopPlaylists(defaultPlaylists);
            }
          }}
          isPinned={isSidebarPinned}
          onTogglePin={() => {
            const nextPin = !isSidebarPinned;
            setIsSidebarPinned(nextPin);
            localStorage.setItem("sidebar_pinned", String(nextPin));
            if (nextPin) {
              setIsSidebarOpen(true);
            }
          }}
        />

        {/* Main Application Shell */}
        <div className={`flex-1 flex overflow-hidden relative z-20 ${
          isFullscreenOpen 
            ? 'opacity-0 pointer-events-none transition-opacity duration-300' 
            : 'opacity-100'
        }`}>
          {(activeArtistId || activeAlbumData) && (
            <div 
              className="absolute inset-0 pointer-events-none z-0" 
              style={{ 
                background: "rgba(6, 6, 6, 0.16)", 
                backdropFilter: "blur(32px)", 
                WebkitBackdropFilter: "blur(32px)", 
              }} 
            />
          )}
          {/* Main Scrollable Content Area */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto pl-[110px] pb-40 select-none relative z-10"
            style={{ 
              marginRight: isNowPlayingOpen ? "400px" : "0px",
              paddingRight: "32px",
              transition: "margin-right 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: "margin-right"
            }}
          >
            {/* Inner wrapper for Lenis to calculate correct content height */}
            <div className="flex flex-col gap-10 w-full min-h-full">
              {/* Header Area for Search */}
            {!(activeArtistId || activeAlbumData) && (
              <div className="flex items-center justify-end pt-[29px] sticky top-0 z-40 bg-transparent">
                <div className="pr-4">
                  <SearchBar 
                    query={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={() => searchTracks(searchQuery)}
                  />
                </div>
              </div>
            )}

            {!(activeArtistId || activeAlbumData) && (
              <>
                {!isSearchActive && (
                  <div className="w-full px-8 box-border overflow-visible">
                    <RecentlyPlayed 
                      tracks={recentlyPlayed}
                      onTrackSelect={handleRecentlyPlayedSelect}
                      currentTrackId={currentTrack?.id}
                      isPlaying={isPlaying}
                    />
                  </div>
                )}

                {!isSearchActive && (
                  <div className="flex flex-col lg:flex-row gap-12 w-full justify-between items-stretch px-8 box-border overflow-visible">
                    <div className="flex-1 overflow-visible">
                      <Coverflow 
                        title="Top Artists" 
                        items={topArtists.map(artist => ({
                          id: artist.id,
                          title: artist.title,
                          subtitle: artist.subtitle,
                          image: artist.image,
                          onClick: () => handleLoadArtistTracks(artist.id),
                          onPlay: () => handlePlayArtist(artist.id)
                        }))}
                        type="artists"
                      />
                    </div>
                    
                    <div className="flex-1 overflow-visible">
                      <Coverflow 
                        title="Top Playlists" 
                        items={topPlaylists.map(playlist => ({
                          id: playlist.id,
                          title: playlist.title,
                          subtitle: playlist.subtitle,
                          image: playlist.image,
                          onClick: () => handleLoadPlaylistTracks(playlist.id),
                          onPlay: () => handlePlayPlaylist(playlist.id)
                        }))}
                        type="playlists"
                      />
                    </div>
                  </div>
                )}

                {isSearchActive && (searchArtists.length > 0 || searchPlaylists.length > 0) && (
                  <div className="flex flex-col lg:flex-row gap-12 w-full justify-between items-stretch px-8 box-border overflow-visible mb-12">
                    {searchArtists.length > 0 && (
                      <div className="flex-1 overflow-visible">
                        <h3 className="text-white/60 font-semibold tracking-widest text-xs mb-4 ml-4 uppercase">Artist</h3>
                        {searchArtists.slice(0, 1).map(artist => (
                          <TopArtistCard 
                            key={artist.id}
                            artist={artist}
                            onClick={() => setActiveArtistId(artist.id)}
                          />
                        ))}
                      </div>
                    )}
                    
                    {searchPlaylists.length > 0 && (
                      <div className="flex-1 overflow-visible">
                        <Coverflow 
                          title="Playlists & Albums" 
                          items={searchPlaylists.map(playlist => ({
                            id: playlist.id,
                            title: playlist.title,
                            subtitle: playlist.subtitle,
                            image: playlist.image,
                            onClick: () => console.log("Navigate to Playlist", playlist.id), // TODO: Playlist Page
                            onPlay: () => console.log("Play Playlist", playlist.id)
                          }))}
                          type="playlists"
                        />
                      </div>
                    )}
                  </div>
                )}

                <TrackGrid 
                  tracks={tracks}
                  onTrackSelect={handleTrackSelect}
                  currentTrackId={currentTrack?.id}
                  isPlaying={isPlaying}
                  isLoading={isLoading}
                  onArtistClick={handleLoadArtistTracks}
                  title={isSearchActive ? "Songs & Videos" : "Today's Hits"}
                />
              </>
            )}
            {activeArtistId && (
              <div style={{ display: activeAlbumData ? 'none' : 'block' }}>
                <ArtistPage 
                  browseId={activeArtistId}
                  fallbackViews={
                    searchArtists.find(a => a.id === activeArtistId)?.subtitle || 
                    topArtists.find(a => a.id === activeArtistId)?.subtitle || 
                    ""
                  }
                  onClose={() => setActiveArtistId(null)}
                  onPlayTrack={handleTrackSelect}
                  currentTrackId={currentTrack?.id}
                  onAlbumClick={(album) => {
                    setActiveAlbumData({
                      id: album.browse_id || album.id,
                      title: album.title,
                      artist: album.uploader,
                      thumbnail: album.thumbnail
                    });
                  }}
                />
              </div>
            )}
            {activeAlbumData && (
              <AlbumPage 
                albumBrowseId={activeAlbumData.id}
                albumTitle={activeAlbumData.title}
                albumArtist={activeAlbumData.artist}
                albumThumbnail={activeAlbumData.thumbnail}
                onClose={() => setActiveAlbumData(null)}
                onPlayPlaylist={handlePlayAlbumQueue}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                isShuffleOn={isShuffleOn}
                setIsShuffleOn={setIsShuffleOn}
              />
            )}
            </div>
          </div>

          {/* Now Playing Sidebar (Right Panel) */}
          <NowPlayingSidebar 
            isOpen={isNowPlayingOpen}
            onClose={() => setIsNowPlayingOpen(false)}
            track={currentTrack}
            isPlaying={isPlaying}
            onPlayToggle={handlePlayToggle}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            allTracks={tracks}
            onTrackSelect={handleTrackSelect}
            onArtistSelect={(id) => setActiveArtistId(id)}
            repeatMode={repeatMode}
            onRepeatToggle={handleRepeatToggle}
            onNext={handleNextTrack}
            onPrevious={handlePreviousTrack}
            onFullscreenToggle={() => setIsFullscreenOpen(!isFullscreenOpen)}
          />
        </div>

        {/* Floating Bottom Playback Bar */}
        <Playbar 
          track={isFullscreenOpen ? null : currentTrack}
          isPlaying={isPlaying}
          onPlayToggle={handlePlayToggle}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          isNowPlayingOpen={isNowPlayingOpen}
          onNowPlayingToggle={() => setIsNowPlayingOpen(!isNowPlayingOpen)}
          repeatMode={repeatMode}
          onRepeatToggle={handleRepeatToggle}
          onNext={handleNextTrack}
          onPrevious={handlePreviousTrack}
          isArtistPage={!!activeArtistId}
          isShuffleOn={isShuffleOn}
          onToggleShuffle={() => setIsShuffleOn(prev => !prev)}
          onArtistClick={handleLoadArtistTracks}
        />

        {/* Hidden Audio Player Element */}
        <audio 
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          loop={repeatMode === 'track'}
        />

        {/* Fullscreen Player Overlay */}
        <PlayerFullscreen 
          isOpen={isFullscreenOpen}
          onClose={handleCloseFullscreen}
          track={currentTrack}
          isPlaying={isPlaying}
          onPlayToggle={handlePlayToggle}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          repeatMode={repeatMode}
          onRepeatToggle={handleRepeatToggle}
          onNext={handleNextTrack}
          onPrevious={handlePreviousTrack}
        />

        {/* 3. Wavy sharp-edged diagonal background layer — GPU-optimized static render */}
        <svg
          className="absolute inset-0 w-full h-full z-10"
          viewBox="0 0 1440 810"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ 
            pointerEvents: "none",
            willChange: "auto",
            contain: "strict",
            contentVisibility: "auto"
          }}
        >
          {/* Base background */}
          <rect width="1440" height="810" fill="#070707" />

          {/* LEFT SIDE: Layered Diagonal Charcoal/Gray Waves */}
          <path
            d="M -50 860 L -580 860 C -380 500, -100 350, 420 -50 L -50 -50 Z"
            fill="#3a3a3a"
          />
          <path
            d="M -50 860 L -410 860 C -150 780, 220 280, 510 -50 L -50 -50 Z"
            fill="#2c2c2c"
          />
          <path
            d="M -50 860 L -250 860 C 50 640, 120 180, 680 -50 L -50 -50 Z"
            fill="#1e1e1e"
          />
          <path
            d="M -50 860 L -80 860 C 320 520, 450 380, 890 -50 L -50 -50 Z"
            fill="#141414"
          />
          <path
            d="M -50 860 L 150 860 C 480 620, 720 200, 1040 -50 L -50 -50 Z"
            fill="#0c0c0c"
          />

          {/* RIGHT SIDE: Layered Diagonal Orange Waves */}
          <path
            d="M 50 860 C 350 720, 480 250, 820 -50 L 1490 -50 L 1490 860 Z"
            fill="#3d0f06"
          />
          <path
            d="M 280 860 C 180 580, 820 420, 990 -50 L 1490 -50 L 1490 860 Z"
            fill="#7a1f0d"
          />
          <path
            d="M 390 860 C 620 530, 780 180, 1180 -50 L 1490 -50 L 1490 860 Z"
            fill="#a8311b"
          />
          <path
            d="M 540 860 C 880 640, 1120 280, 1310 -50 L 1490 -50 L 1490 860 Z"
            fill="#F26B50"
          />
          <path
            d="M 850 860 C 1080 620, 1220 380, 1520 -50 L 1490 -50 L 1490 860 Z"
            fill="#ffa391"
          />
        </svg>

        {/* Static CSS noise texture overlay — rendered once, zero GPU cost during scroll */}
        <div
          className="noise-overlay"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 11,
            pointerEvents: "none",
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
            contain: "strict",
            willChange: "auto"
          }}
        />
      </div>
    </main>
  );
}
