import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSearch } from '../api/queries';
import { usePlayerStore } from '../store/usePlayerStore';
import { getPosterUrl } from '../utils/imageUtils';
import TopArtistCard from '../components/search/TopArtistCard';
import { TrackGrid } from '../components/home/TrackGrid';

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();

  const { data, isLoading, isError } = useSearch(query);

  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);


  const [tracks, setTracks] = useState<any[]>([]);
  const [youtubeTracks, setYoutubeTracks] = useState<any[]>([]);
  const [searchArtists, setSearchArtists] = useState<any[]>([]);

  useEffect(() => {
    if (data) {
      const mappedTracks: any[] = [];
      const mappedYoutube: any[] = [];
      const mappedArtists: any[] = [];

      const topResult = data.ytMusic?.find((item: any) => item.category === "Top result");
      if (topResult && (topResult.resultType === "artist" || topResult.resultType === "channel")) {
        mappedArtists.push({
          id: topResult.browseId || topResult.channelId || topResult.artists?.[0]?.id,
          title: topResult.artist || topResult.title || topResult.name || topResult.artists?.[0]?.name || "Unknown Artist",
          image: getPosterUrl(topResult),
          subtitle: topResult.subscribers ? `${topResult.subscribers} subscribers` : "Artist",
        });
      }

      data.ytMusic?.forEach((item: any) => {
        if (item.resultType === "song" || item.resultType === "video") {
          mappedTracks.push({
            id: item.videoId,
            title: item.title,
            artist: item.artists?.[0]?.name || "Unknown",
            artistId: item.artists?.[0]?.id,
            album: item.album?.name || "Unknown Album",
            poster: getPosterUrl(item),
            previewUrl: "",
            source: "youtube"
          });
        }
      });

      data.youtube?.forEach((item: any) => {
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
    } else {
      setTracks([]);
      setYoutubeTracks([]);
      setSearchArtists([]);
    }
  }, [data]);

  const handleTrackSelect = (track: any) => {
    const fetchAndPlayWatchQueue = usePlayerStore.getState().fetchAndPlayWatchQueue;
    fetchAndPlayWatchQueue(track);
  };

  const handleLoadArtistTracks = (artistId: string) => {
    navigate(`/artist/${artistId}`);
  };

  if (!query) {
    return <div className="p-8 text-white/50">Type something to search...</div>;
  }

  if (isLoading) {
    return <div className="p-8 text-white/50">Searching for '{query}'...</div>;
  }

  if (isError) {
    return <div className="p-8 text-red-500">Failed to load search results.</div>;
  }

  return (
    <>
      {searchArtists.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-12 w-full justify-between items-stretch px-8 box-border overflow-visible mb-12">
          <div className="flex-1 overflow-visible">
            <h3 className="text-white/60 font-semibold tracking-widest text-xs mb-4 ml-4 uppercase">Artist</h3>
            {searchArtists.slice(0, 1).map(artist => (
              <TopArtistCard 
                key={artist.id}
                artist={artist}
                onClick={() => navigate(`/artist/${artist.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {tracks.length > 0 && (
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

      {youtubeTracks.length > 0 && (
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
  );
};
