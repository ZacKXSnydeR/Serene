import { useState, useEffect, useRef } from "react";
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

import { Sidebar } from "./components/layout/Sidebar";
import { SearchBar } from "./components/layout/SearchBar";
import { TrackGrid } from "./components/home/TrackGrid";
import { RecentlyPlayed } from "./components/home/RecentlyPlayed";
import { Playbar } from "./components/player/Playbar";
import { NowPlayingSidebar } from "./components/player/NowPlayingSidebar";
import { Coverflow } from "./components/home/Coverflow";
import { PlayerFullscreen } from "./components/player/PlayerFullscreen";

import ArtistPage from "./components/artist/ArtistPage";
import AlbumPage from "./components/album/AlbumPage";
import TopArtistCard from "./components/search/TopArtistCard";
import { ProfilePage } from "./components/profile/ProfilePage";
import { getPosterUrl } from "./utils/imageUtils";
import { LikedSongsView } from "./components/library/LikedSongsView";
import { HistoryView } from "./components/library/HistoryView";
import { PlaylistsView } from "./components/library/PlaylistsView";
import { HomeSection } from "./components/home/HomeSection";

const appWindow = getCurrentWindow();

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [activeView, setActiveView] = useState<"home" | "search" | "artist" | "album" | "profile" | "liked" | "history" | "playlists" | "library">("home");
  const [isHoveringTop, setIsHoveringTop] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Custom Page states
  const [activeArtistId, setActiveArtistId] = useState<string | null>(null);
  const [activeAlbumData, setActiveAlbumData] = useState<{ id: string, title: string, artist: string, thumbnail: string, type?: "album" | "playlist" } | null>(null);

  // Deezer global chart data states
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [topPlaylists, setTopPlaylists] = useState<any[]>([]);

  // Session cache states for homepage
  const [defaultArtists, setDefaultArtists] = useState<any[]>([]);
  const [defaultPlaylists, setDefaultPlaylists] = useState<any[]>([]);
  const [homeSections, setHomeSections] = useState<any[]>([]);
  

  // Dynamic Music Playback & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<any[]>([]);
  const [youtubeTracks, setYoutubeTracks] = useState<any[]>([]);
  const [searchArtists, setSearchArtists] = useState<any[]>([]);

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



  const handleSearch = async (forcedQuery?: string) => {
    const q = forcedQuery || searchQuery;
    if (!q.trim()) return;
    setIsSearchActive(true);
    setIsLoading(true);
    try {
      const [res, resVideos] = await Promise.all([
        fetch(`http://127.0.0.1:5050/search?query=${encodeURIComponent(q)}`),
        fetch(`http://127.0.0.1:5050/youtube/search?query=${encodeURIComponent(q)}`)
      ]);
      if (!res.ok || !resVideos.ok) throw new Error("Search failed");
      const data = await res.json();
      const videoData = await resVideos.json();
      
      const mappedTracks: any[] = [];
      const mappedYoutube: any[] = [];
      const mappedArtists: any[] = [];

      // Look for the absolute "Top result" to decide if we show the Artist Card
      const topResult = data.find((item: any) => item.category === "Top result");
      if (topResult && (topResult.resultType === "artist" || topResult.resultType === "channel")) {
        const artistName = topResult.artist || topResult.title || topResult.name || topResult.artists?.[0]?.name;
        const artistId = topResult.browseId || topResult.channelId || topResult.artists?.[0]?.id;
        const subText = topResult.subscribers ? `${topResult.subscribers} subscribers` : "Artist";
        
        mappedArtists.push({
          id: artistId,
          title: artistName || "Unknown Artist",
          image: getPosterUrl(topResult),
          subtitle: subText,
        });
      }

      data.forEach((item: any) => {
        if (item.resultType === "song" || item.resultType === "video") {
          mappedTracks.push({
            id: item.videoId,
            title: item.title,
            artist: item.artists?.[0]?.name || "Unknown",
            artistId: item.artists?.[0]?.id,
            album: item.album?.name || (item.resultType === "video" ? "YouTube" : "YT Music"),
            poster: getPosterUrl(item),
            previewUrl: "",
            source: "youtube"
          });
        }
      });

      videoData.forEach((item: any) => {
        if (!mappedTracks.find(t => t.id === (item.videoId || item.id))) {
          mappedYoutube.push({
            id: item.id || item.videoId,
            title: item.title,
            artist: item.artist || item.artists?.[0]?.name || "Unknown",
            artistId: item.artistId || item.artists?.[0]?.id,
            album: "YouTube",
            poster: getPosterUrl(item),
            previewUrl: "",
            source: "youtube"
          });
        }
      });

      setTracks(mappedTracks);
      setYoutubeTracks(mappedYoutube.slice(0, 12));
      setSearchArtists(mappedArtists);
    } catch (err) {
      console.error("Failed to fetch tracks:", err);
      setTracks([]);
      setYoutubeTracks([]);
      setSearchArtists([]);
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
    if (storedPin !== null) {
      const isPinned = storedPin === "true";
      setIsSidebarPinned(isPinned);
      setIsSidebarOpen(isPinned);
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



  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoading(true);
      try {
        // Fetch charts for top artists and playlists
        // Add country setting support
        const country = localStorage.getItem("ytm_country") || "ZZ";
        const chartsRes = await fetch(`http://127.0.0.1:5050/charts?country=${country}`);
        const chartsData = await chartsRes.json();
        
        if (chartsData.artists && Array.isArray(chartsData.artists)) {
          const artists = chartsData.artists.slice(0, 10).map((a: any) => ({
            id: a.browseId,
            title: a.title,
            subtitle: "Global Top Artist",
            image: getPosterUrl(a)
          }));
          setTopArtists(artists);
          setDefaultArtists(artists);
        }

        // Fetch dynamic home sections instead of a static playlist
        const homeRes = await fetch(`http://127.0.0.1:5050/home?limit=6&country=${country}`);
        if (homeRes.ok) {
          const homeData = await homeRes.json();
          setHomeSections(homeData);
        }

        // Use charts videos (which are playlists) for Top Playlists Coverflow
        if (chartsData.videos && Array.isArray(chartsData.videos)) {
          const mappedPlaylists = chartsData.videos.map((p: any) => ({
            id: p.playlistId,
            title: p.title,
            subtitle: "Top Charts",
            image: getPosterUrl(p)
          }));
          setTopPlaylists(mappedPlaylists);
          setDefaultPlaylists(mappedPlaylists);
        }

      } catch (err) {
        console.error("Failed to fetch YT Music home data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHomeData();

    const handleAuthChange = () => fetchHomeData();
    window.addEventListener("auth-changed", handleAuthChange);
    
    return () => {
      window.removeEventListener("auth-changed", handleAuthChange);
    };
  }, []);

  const handlePlayArtist = async (_artistId: string) => {
    setIsLoading(true);
    try {
      setTracks([]);
    } catch (err) {
      console.error("Failed to play artist tracks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadArtistTracks = async (artistId: string) => {
    setActiveArtistId(artistId);
  };

  const handlePlayPlaylist = async (_playlistId: string) => {
    setIsLoading(true);
    try {
      setTracks([]);
    } catch (err) {
      console.error("Failed to play playlist tracks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadPlaylistTracks = (playlist: any) => {
    setActiveAlbumData({
      id: playlist.playlistId || playlist.id,
      title: playlist.title,
      artist: playlist.author?.name || (typeof playlist.author === 'string' ? playlist.author : "You"),
      thumbnail: getPosterUrl(playlist),
      type: "playlist"
    });
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

  const handleLoadAlbum = (id: string, item: any) => {
    setActiveAlbumData({
      id: id,
      title: item.title || "Unknown Album",
      artist: item.artist || item.uploader || item.artists?.[0]?.name || "Various Artists",
      thumbnail: getPosterUrl(item)
    });
  };

  // Unified handler for HomeSection clicks
  const handleHomeItemClick = (item: any) => {
    if (item.videoId) {
      // It's a track
      const track = {
        id: item.videoId,
        title: item.title,
        artist: item.artists?.[0]?.name || "Unknown",
        artistId: item.artists?.[0]?.id,
        album: item.album?.name || "YT Music",
        poster: getPosterUrl(item),
        previewUrl: "",
        source: "youtube"
      };
      // For Quick Picks, we should probably set the tracks array so it can autoplay next
      // But for simplicity, we just play this single track if we don't have a playlist context
      handleTrackSelect(track);
    } else if (item.playlistId) {
      // It's a playlist or album
      if (item.playlistId.startsWith("VL")) {
        // sometimes playlists are prefixed with VL
        item.playlistId = item.playlistId.substring(2);
      }
      handleLoadAlbum(item.playlistId, item);
    } else if (item.browseId) {
      // It's an album or artist
      if (item.browseId.startsWith("UC") || item.browseId.startsWith("HC")) {
        setActiveArtistId(item.browseId);
      } else {
        handleLoadAlbum(item.browseId, item);
      }
    }
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

    // Add track to recent history
    try {
      await fetch("http://127.0.0.1:5050/history/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song: track.id })
      });
    } catch (err) {
      console.error("Failed to add to history:", err);
    }

    // Fetch actual stream URL
    try {
      const res = await fetch(`http://127.0.0.1:5050/stream/${track.id}`);
      if (!res.ok) throw new Error("Failed to fetch stream URL");
      const data = await res.json();
      
      if (audioRef.current) {
        audioRef.current.src = data.url;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error("Playback failed:", err);
          setIsPlaying(false);
        });
      }
    } catch (err) {
      console.error("Stream fetch error:", err);
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
          activeNav={activeView}
          setActiveNav={(id: any) => {
            setActiveView(id);
            setActiveArtistId(null);
            setActiveAlbumData(null);
            if (id === "home") {
              setIsSearchActive(false);
              setSearchQuery("");
              // Restore cached homepage charts from state instantly
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
            {!(activeArtistId || activeAlbumData) && activeView !== "profile" && (
              <div className="flex items-center justify-end pt-[29px] sticky top-0 z-40 bg-transparent">
                <div className="pr-4">
                  <SearchBar 
                    query={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={(q) => handleSearch(q)}
                  />
                </div>
              </div>
            )}

            {activeView === "home" && !(activeArtistId || activeAlbumData) && (
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

                {isSearchActive && searchArtists.length > 0 && (
                  <div className="flex flex-col lg:flex-row gap-12 w-full justify-between items-stretch px-8 box-border overflow-visible mb-12">
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
                  </div>
                )}

                {!isSearchActive && homeSections.map((section, idx) => (
                  <HomeSection 
                    key={idx} 
                    section={section} 
                    onItemClick={handleHomeItemClick} 
                  />
                ))}

                {isSearchActive && tracks.length > 0 && (
                  <TrackGrid 
                    tracks={tracks}
                    onTrackSelect={handleTrackSelect}
                    currentTrackId={currentTrack?.id}
                    isPlaying={isPlaying}
                    isLoading={isLoading}
                    onArtistClick={handleLoadArtistTracks}
                    title="Songs & Videos"
                  />
                )}

                {isSearchActive && youtubeTracks.length > 0 && (
                  <TrackGrid 
                    tracks={youtubeTracks}
                    onTrackSelect={handleTrackSelect}
                    currentTrackId={currentTrack?.id}
                    isPlaying={isPlaying}
                    isLoading={isLoading}
                    onArtistClick={handleLoadArtistTracks}
                    title="More from YouTube"
                  />
                )}
              </>
            )}
            
            {activeView === "profile" && !(activeArtistId || activeAlbumData) && <ProfilePage />}

            {activeView === "liked" && !(activeArtistId || activeAlbumData) && (
              <LikedSongsView 
                onTrackSelect={handleTrackSelect}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onArtistClick={handleLoadArtistTracks}
              />
            )}

            {activeView === "history" && !(activeArtistId || activeAlbumData) && (
              <HistoryView 
                onTrackSelect={handleTrackSelect}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onArtistClick={handleLoadArtistTracks}
              />
            )}

            {activeView === "playlists" && !(activeArtistId || activeAlbumData) && (
              <PlaylistsView 
                onPlaylistSelect={handleLoadPlaylistTracks}
              />
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
                      id: album.browseId || album.browse_id || album.id || "",
                      title: album.title || "Unknown Album",
                      artist: album.uploader || album.artists?.[0]?.name || "Unknown Artist",
                      thumbnail: getPosterUrl(album)
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
                type={activeAlbumData.type || "album"}
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
