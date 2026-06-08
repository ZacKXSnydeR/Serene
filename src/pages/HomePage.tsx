import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RecentlyPlayed } from '../components/home/RecentlyPlayed';
import { Coverflow } from '../components/home/Coverflow';
import { HomeSection } from '../components/home/HomeSection';

import { useHomeData } from '../api/queries';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { getPosterUrl } from '../utils/imageUtils';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useHomeData();
  
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);

  
  const recentlyPlayed = useLibraryStore(state => state.recentlyPlayed);

  const artistsRaw = data?.charts?.artists;
  const artistsArray = Array.isArray(artistsRaw) ? artistsRaw : (artistsRaw?.items || []);
  const topArtists = artistsArray.slice(0, 10).map((a: any) => ({
    id: a.browseId,
    title: a.title,
    subtitle: "Global Top Artist",
    image: getPosterUrl(a)
  })) || [];

  const videosRaw = data?.charts?.videos;
  const videosArray = Array.isArray(videosRaw) ? videosRaw : (videosRaw?.items || []);
  const topPlaylists = videosArray.map((p: any) => ({
    id: p.playlistId || p.videoId,
    title: p.title,
    subtitle: "Top Charts",
    image: getPosterUrl(p)
  })) || [];

  const handleTrackSelect = (track: any) => {
    const fetchAndPlayWatchQueue = usePlayerStore.getState().fetchAndPlayWatchQueue;
    fetchAndPlayWatchQueue(track);
  };

  const handleHomeItemClick = (item: any) => {
    if (item.videoId) {
      const track = {
        id: item.videoId,
        title: item.title,
        artist: item.artists?.[0]?.name || "Unknown",
        artistId: item.artists?.[0]?.id,
        album: item.album?.name || "Unknown Album",
        poster: getPosterUrl(item),
        previewUrl: "",
        source: "youtube"
      };
      handleTrackSelect(track);
    } else if (item.playlistId) {
      let pId = item.playlistId;
      if (pId.startsWith("VL")) pId = pId.substring(2);
      navigate(`/album/${pId}`);
    } else if (item.browseId) {
      if (item.browseId.startsWith("UC") || item.browseId.startsWith("HC")) {
        navigate(`/artist/${item.browseId}`);
      } else {
        navigate(`/album/${item.browseId}`);
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-white/50">Loading Home Data...</div>;
  }

  return (
    <>
      <div className="w-full px-8 box-border overflow-visible">
        <RecentlyPlayed 
          tracks={recentlyPlayed}
          onTrackSelect={handleTrackSelect}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-12 w-full justify-between items-stretch px-8 box-border overflow-visible">
        <div className="flex-1 overflow-visible">
          <Coverflow 
            title="Top Artists" 
            items={topArtists.map((artist: any) => ({
              ...artist,
              onClick: () => navigate(`/artist/${artist.id}`),
              onPlay: () => navigate(`/artist/${artist.id}`) // Needs implementation
            }))}
            type="artists"
          />
        </div>
        
        <div className="flex-1 overflow-visible">
          <Coverflow 
            title="Top Playlists" 
            items={topPlaylists.map((playlist: any) => ({
              ...playlist,
              onClick: () => navigate(`/album/${playlist.id}`),
              onPlay: () => navigate(`/album/${playlist.id}`) // Needs implementation
            }))}
            type="playlists"
          />
        </div>
      </div>

      {(Array.isArray(data?.homeSections) ? data.homeSections : [])
        ?.filter((section: any) => !section?.title?.toLowerCase()?.includes("trending community playlists"))
        .map((section: any, idx: number) => (
        <HomeSection 
          key={idx} 
          section={section} 
          onItemClick={handleHomeItemClick} 
        />
      ))}
    </>
  );
};
