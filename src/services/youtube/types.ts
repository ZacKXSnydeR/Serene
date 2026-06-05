export interface YouTubeSearchResult {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  uploader: string;
  uploader_id?: string | null;
  views?: string;
  result_type?: string;
  browse_id?: string | null;
}

export interface YouTubeArtistDetails {
  name: string;
  description: string;
  image: string;
  views?: string;
  top_songs: YouTubeSearchResult[];
  albums: YouTubeSearchResult[];
  singles: YouTubeSearchResult[];
}

export interface YtDlpMetadata {
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string;
  description: string;
  view_count?: number;
  upload_date?: string;
}

export interface YouTubeAlbumDetails {
  title: string;
  artist: string;
  year: string;
  track_count: string;
  thumbnail: string;
  tracks: YouTubeSearchResult[];
}
