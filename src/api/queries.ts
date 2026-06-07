import { useQuery, useMutation } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { apiClient } from './client';

// Search
export const useSearch = (query: string) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim()) return { ytMusic: [], youtube: [] };
      const [ytMusic, youtube] = await Promise.all([
        apiClient.get<any, any>(`/search?query=${encodeURIComponent(query)}`),
        apiClient.get<any, any>(`/youtube/search?query=${encodeURIComponent(query)}`)
      ]);
      return { ytMusic, youtube };
    },
    enabled: !!query.trim(),
  });
};

// Home Data
export const useHomeData = (country: string = 'ZZ') => {
  return useQuery({
    queryKey: ['home', country],
    queryFn: async () => {
      const [charts, homeSections] = await Promise.all([
        apiClient.get<any, any>(`/charts?country=${country}`),
        apiClient.get<any, any>(`/home?limit=6&country=${country}`)
      ]);
      return { charts, homeSections };
    },
  });
};

// Stream URL
export const useStreamUrl = (trackId: string | null) => {
  return useQuery({
    queryKey: ['stream', trackId],
    queryFn: () => apiClient.get<any, any>(`/stream/${trackId}`),
    enabled: !!trackId,
    // Stream URLs might expire, so we might not want to cache them indefinitely
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};
// Artist
export const useArtist = (artistId: string | null) => {
  return useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => apiClient.get<any, any>(`/artist/${artistId}`),
    enabled: !!artistId,
  });
};

// Album / Playlist
export const useAlbum = (albumId: string | null) => {
  return useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      if (!albumId) throw new Error("No albumId");
      
      if (albumId.startsWith("local_pl_")) {
        const localPlaylists = await invoke<any[]>('get_local_playlists');
        const playlist = localPlaylists.find(p => p.id === albumId);
        
        if (!playlist) throw new Error("Local playlist not found");
        
        // Map local playlist to the format AlbumPage expects
        let thumbnail = "";
        if (playlist.tracks && playlist.tracks.length > 0 && playlist.tracks[0].poster) {
          thumbnail = playlist.tracks[0].poster;
        }

        return {
          title: playlist.title,
          author: { name: "Local Library" },
          year: "Local",
          trackCount: playlist.tracks?.length || 0,
          thumbnail: thumbnail,
          thumbnails: thumbnail ? [{ url: thumbnail }] : [],
          tracks: (playlist.tracks || []).map((t: any) => ({
            videoId: t.video_id,
            title: t.title,
            artists: [{ name: t.artist }],
            uploader: t.artist,
            thumbnails: [{ url: t.poster }]
          }))
        };
      }
      
      return apiClient.get<any, any>(`/album/${albumId}`);
    },
    enabled: !!albumId,
  });
};
// History Mutation
export const useAddHistory = () => {
  return useMutation({
    mutationFn: (songId: string) => apiClient.post<any, any>('/history/add', { song: songId }),
  });
};
