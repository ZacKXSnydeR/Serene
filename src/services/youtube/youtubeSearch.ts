import { invoke } from '@tauri-apps/api/core';
import { YouTubeSearchResult, YouTubeArtistDetails } from './types';

// Persistent Cache Helper (1-day TTL)
const CACHE_TTL_1_DAY = 1000 * 60 * 60 * 24;

function getCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL_1_DAY) {
        return parsed.data as T;
      } else {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.warn("Failed to read cache", e);
  }
  return null;
}

function setCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn("Failed to set cache", e);
  }
}

export async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  const cacheKey = `yt_search_${query}`;
  const cached = getCache<YouTubeSearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const results = await invoke<YouTubeSearchResult[]>('youtube_search', { query });
    if (results && results.length > 0) {
      setCache(cacheKey, results);
    }
    return results;
  } catch (error) {
    console.error('Failed to search YouTube:', error);
    throw error;
  }
}

export async function fetchArtistDetails(browseId: string): Promise<YouTubeArtistDetails | null> {
  const cacheKey = `yt_artist_${browseId}`;
  const cached = getCache<YouTubeArtistDetails>(cacheKey);
  if (cached) return cached;
  
  try {
    const results = await invoke<YouTubeArtistDetails>('ytmusic_get_artist', { browseId });
    if (results) {
      setCache(cacheKey, results);
    }
    return results;
  } catch (error) {
    console.error('Failed to fetch artist details:', error);
    return null;
  }
}

export async function fetchArtistTopTracks(artist: string): Promise<YouTubeSearchResult[]> {
  try {
    const results = await searchYouTube(artist);
    // Filter to only include songs to avoid mixing with artist cards or playlists
    return results.filter(r => r.result_type === 'song');
  } catch (error) {
    console.error('Failed to fetch top tracks from YT Music:', error);
    throw error;
  }
}

export async function fetchAlbumDetails(browseId: string, title: string, artist: string, thumbnail: string): Promise<any> {
  const cacheKey = `yt_album_${browseId}`;
  const cached = getCache<any>(cacheKey);
  if (cached) return cached;

  try {
    const results = await invoke('ytmusic_get_album', { browseId, title, artist, thumbnail });
    if (results) {
      setCache(cacheKey, results);
    }
    return results;
  } catch (error) {
    console.error('Failed to fetch album details:', error);
    return null;
  }
}
