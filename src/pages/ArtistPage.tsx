import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useArtist } from '../api/queries';
import { usePlayerStore } from '../store/usePlayerStore';
import { getPosterUrl } from '../utils/imageUtils';
import '../components/artist/artistpage.css';

export const ArtistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: artistData, isLoading } = useArtist(id || null);

  const currentTrack = usePlayerStore(state => state.currentTrack);
  const playPlaylist = usePlayerStore(state => state.playPlaylist);

  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [showAllSongs, setShowAllSongs] = useState(false);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!artistData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white/50 min-h-[50vh]">
        <p>Failed to load artist details</p>
      </div>
    );
  }

  const artist = {
    name: artistData.name || "",
    description: artistData.description || "",
    image: getPosterUrl(artistData),
    top_songs: artistData.songs?.results || [],
    albums: artistData.albums?.results || [],
    singles: artistData.singles?.results || [],
    views: artistData.views || "",
    isPodcastChannel: artistData.isPodcastChannel
  };



  const mapToInternalTrack = (item: any) => ({
    id: item.videoId || item.id,
    title: item.title,
    artist: item.artists?.[0]?.name || item.uploader || artist.name,
    artistId: item.artists?.[0]?.id || item.uploader_id || id,
    album: "Unknown Album",
    poster: getPosterUrl(item),
    previewUrl: "",
    source: "youtube",
    views: item.views,
    date: item.date
  });

  const mappedTopSongs = artist.top_songs.map(mapToInternalTrack);
  const displayedSongs = showAllSongs ? mappedTopSongs : mappedTopSongs.slice(0, 5);

  const handlePlayTrack = (_track: any, index: number) => {
    playPlaylist(mappedTopSongs, index);
  };

  const handleAlbumClick = (album: any) => {
    let browseId = album.browseId || album.browse_id || album.id;
    if (browseId) navigate(`/album/${browseId}`);
  };

  const renderVinylCard = (item: any, typeLabel: string, index: number) => {
    const poster = getPosterUrl(item);
    return (
      <div key={item.id || item.browseId || item.browse_id || `vinyl-${index}`} className="album-vinyl-card" onClick={() => handleAlbumClick(item)}>
        <div className="album-vinyl-wrapper">
          <div className="album-vinyl-disc">
            <div className="album-vinyl-groove album-vinyl-groove-1"></div>
            <div className="album-vinyl-groove album-vinyl-groove-2"></div>
            <div className="album-vinyl-groove album-vinyl-groove-3"></div>
            <div className="album-vinyl-label">
              <img src={poster} alt="label" />
              <div className="album-vinyl-hole"></div>
            </div>
          </div>
          <div className="album-vinyl-sleeve">
            <img src={poster} alt={item.title} />
            <div className="album-sleeve-gloss"></div>
          </div>
        </div>
        <p className="album-card-title">{item.title}</p>
        <p className="album-card-subtitle">{item.uploader || item.artists?.[0]?.name || typeLabel}</p>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-12 pt-12 pb-48 flex flex-col gap-16 relative">
      <div className="flex flex-col items-start gap-6 relative z-10">
        <div className="w-64 h-64 rounded-full overflow-hidden shadow-2xl border-4 border-white/10 flex-shrink-0">
           <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col gap-2 mt-2 w-full max-w-3xl">
          <div className="flex items-center gap-4">
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter drop-shadow-lg">{artist.name}</h1>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F26B50] text-black shadow-md mt-2" title="Verified Artist">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
          {artist.views && <p className="text-[#F26B50] text-lg font-bold tracking-wide uppercase">{artist.views}</p>}
          {artist.description && (
            <div className="mt-4">
              <p className={`text-white/70 font-medium leading-relaxed ${isBioExpanded ? '' : 'line-clamp-3'}`}>{artist.description}</p>
              {artist.description.length > 150 && (
                <button onClick={() => setIsBioExpanded(!isBioExpanded)} className="text-white/50 text-sm font-bold hover:text-white mt-2 transition-colors uppercase tracking-wider">
                  {isBioExpanded ? "Show Less" : "Show More"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {mappedTopSongs.length > 0 && (
        <div className="flex flex-col gap-6 relative z-20">
          <h2 className="text-3xl font-black text-white tracking-tight">{artist.isPodcastChannel ? "Latest Episodes & Videos" : "Top Songs"}</h2>
          <div className="flex flex-col gap-2">
            {displayedSongs.map((track: any, index: number) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div key={track.id} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors group ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5 bg-black/20'}`} onClick={() => handlePlayTrack(track, index)}>
                  <div className="w-6 text-center text-white/50 text-sm font-bold group-hover:text-white transition-colors">
                    {isCurrent ? (
                      <div className="flex items-end justify-center gap-[2px] h-4 mx-auto w-4">
                        <div className="eq-bar eq-bar-1"></div><div className="eq-bar eq-bar-2"></div><div className="eq-bar eq-bar-3"></div>
                      </div>
                    ) : (index + 1)}
                  </div>
                  <img src={track.poster} alt={track.title} className="w-12 h-12 rounded-md object-cover shadow-md" />
                  <div className="flex-1 flex flex-col justify-center">
                    <p className={`font-bold text-base truncate ${isCurrent ? 'text-[#F26B50]' : 'text-white'}`}>{track.title}</p>
                    <p className="text-white/50 text-sm truncate">{track.artist}</p>
                  </div>
                  {(track.views || track.date) && <div className="text-white/40 text-sm hidden md:block pr-4">{track.views ? (track.views.includes('views') ? track.views : `${track.views} plays`) : track.date}</div>}
                </div>
              );
            })}
            {mappedTopSongs.length > 5 && (
              <div className="mt-4 flex justify-start">
                <button onClick={() => setShowAllSongs(!showAllSongs)} className="px-6 py-2 bg-white/10 text-white border border-white/20 rounded-full font-bold hover:bg-white/20 transition-colors">
                  {showAllSongs ? "Show Less" : "Show All"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {artist.albums.length > 0 && (
        <div className="flex flex-col gap-6 relative z-20">
          <h2 className="text-3xl font-black text-white tracking-tight">Albums</h2>
          <div className="album-card-grid">
            {artist.albums.map((album: any, index: number) => renderVinylCard(album, "Album", index))}
          </div>
        </div>
      )}

      {artist.singles.length > 0 && (
        <div className="flex flex-col gap-6 relative z-20">
          <h2 className="text-3xl font-black text-white tracking-tight">Singles & EPs</h2>
          <div className="album-card-grid">
            {artist.singles.map((single: any, index: number) => renderVinylCard(single, "Single", index))}
          </div>
        </div>
      )}
    </div>
  );
};
