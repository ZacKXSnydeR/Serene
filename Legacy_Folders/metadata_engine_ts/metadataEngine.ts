import { invoke } from '@tauri-apps/api/core';

export type ContentType = 'music_track' | 'channel' | 'audio_story' | 'podcast' | 'unknown';
export type EntityType = 'solo_artist' | 'band' | 'creator' | 'label' | 'unknown';

export interface ResolvedEntity {
  content_type: ContentType;
  title: string;
  thumbnail?: string;
  confidence: number;
  sources_used: string[];
  // Music fields
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  artist_image?: string;
  artist_bio?: string;
  duration_seconds?: number;
  entity_type?: EntityType;
  isrc?: string;
  musicbrainz_id?: string;
  // Channel fields
  channel_name?: string;
  channel_avatar?: string;
  channel_description?: string;
  channel_subscriber_count?: string;
  channel_content_type?: string;
}

export interface ResolveMetadataArgs {
  title: string;
  artist: string;
  ytId?: string;
  duration?: number;
  ytCategories?: string[];
  ytTags?: string[];
  hasChapters?: boolean;
  channelId?: string;
}

export async function resolveMetadata(args: ResolveMetadataArgs): Promise<ResolvedEntity> {
  return invoke<ResolvedEntity>('resolve_metadata', {
    args: {
      title: args.title,
      artist: args.artist,
      yt_id: args.ytId ?? null,
      duration: args.duration ?? null,
      yt_categories: args.ytCategories ?? null,
      yt_tags: args.ytTags ?? null,
      has_chapters: args.hasChapters ?? null,
      channel_id: args.channelId ?? null,
    },
  });
}
