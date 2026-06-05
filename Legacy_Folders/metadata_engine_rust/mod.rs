pub mod cache;
pub mod fetcher;
pub mod merger;
pub mod normalize;
pub mod router;
pub mod scorer;
pub mod types;

use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::State;

use cache::MetadataCache;
use types::{ChannelDetails, ContentType, ResolutionInput, ResolvedEntity};

#[derive(Debug, Serialize, Deserialize)]
pub struct ResolveMetadataArgs {
    pub title: String,
    pub artist: String,
    pub yt_id: Option<String>,
    pub duration: Option<f64>,
    pub yt_categories: Option<Vec<String>>,
    pub yt_tags: Option<Vec<String>>,
    pub has_chapters: Option<bool>,
    pub channel_id: Option<String>,
}

#[tauri::command]
pub async fn resolve_metadata(
    args: ResolveMetadataArgs,
    cache: State<'_, MetadataCache>,
) -> Result<ResolvedEntity, String> {
    let cache_key = MetadataCache::make_key(&args.title, &args.artist);

    if let Some(cached) = cache.get(&cache_key) {
        return Ok(cached);
    }

    let client = Client::new();

    // Step 1: Always fetch channel details if we have a channel_id
    let channel_details = if let Some(ref cid) = args.channel_id {
        fetcher::fetch_channel_details(&client, cid).await
    } else {
        ChannelDetails::default()
    };

    let input = ResolutionInput {
        title: args.title.clone(),
        artist: args.artist.clone(),
        yt_id: args.yt_id.clone(),
        duration: args.duration,
        yt_categories: args.yt_categories.unwrap_or_default(),
        yt_tags: args.yt_tags.unwrap_or_default(),
        has_chapters: args.has_chapters.unwrap_or(false),
        channel_id: args.channel_id.clone(),
        channel_details: channel_details.clone(),
    };

    let content_type = router::classify(&input);

    // Step 2: ALWAYS resolve track-level music metadata.
    // Even if the video is from a label/third-party channel, the SONG still has
    // a real artist that we must discover from MusicBrainz/Deezer/YTMusic.
    let mut entity = resolve_track_metadata(&client, &input).await;

    // Step 3: Layer channel metadata on top. The channel info goes into the
    // channel_* fields; it never overwrites the resolved artist.
    entity.content_type = content_type.clone();
    entity.channel_name = Some(args.artist.clone());
    entity.channel_avatar = channel_details.avatar.clone();
    entity.channel_description = channel_details.description.clone();
    entity.channel_subscriber_count = channel_details.sub_count.clone();
    entity.channel_content_type = Some(
        merger::infer_channel_content_type(&channel_details.tabs)
    );

    // Step 4: If the resolved artist is still the channel name (meaning music
    // databases couldn't find a different artist), and we DO have a resolved
    // artist from title parsing, prefer the title-parsed one.
    if let Some(ref resolved_artist) = entity.artist {
        if resolved_artist == &args.artist && resolved_artist.is_empty() {
            // Keep whatever we got
        }
    }

    // Step 5: Wikipedia bio lookup.
    // Always try to fetch the bio if it's missing, using the RESOLVED artist.
    if entity.artist_bio.is_none() {
        if let Some(ref resolved_artist) = entity.artist {
            if !resolved_artist.is_empty() {
                let bio = fetcher::fetch_artist_bio(&client, resolved_artist).await;
                if let Some((bio_text, bio_image)) = bio {
                    entity.artist_bio = Some(bio_text);
                    if entity.artist_image.is_none() {
                        entity.artist_image = bio_image;
                    }
                }
            }
        }
    }

    let is_channel = !matches!(content_type, ContentType::MusicTrack | ContentType::Unknown);
    cache.put(&cache_key, &entity, is_channel);
    Ok(entity)
}

async fn resolve_track_metadata(client: &Client, input: &ResolutionInput) -> ResolvedEntity {
    let query = normalize::normalize(&input.title, &input.artist);

    let mut candidates = fetcher::fetch_all(client, &query, input.duration).await;

    if candidates.is_empty() {
        return ResolvedEntity {
            content_type: ContentType::Unknown,
            title: query.title,
            thumbnail: None,
            confidence: 0.0,
            sources_used: vec![],
            artist: if query.artist.is_empty() { None } else { Some(query.artist) },
            artist_bio: None,
            album: None,
            genre: None,
            year: None,
            artist_image: None,
            duration_seconds: input.duration,
            entity_type: None,
            isrc: None,
            musicbrainz_id: None,
            channel_name: None,
            channel_avatar: None,
            channel_description: None,
            channel_subscriber_count: None,
            channel_content_type: None,
        };
    }

    let all_isrcs = scorer::collect_isrcs(&candidates);

    for candidate in &mut candidates {
        candidate.score = scorer::score_candidate(&query, candidate, &all_isrcs, input.duration);
    }

    candidates.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

    merger::merge(&candidates, &input.title, None)
}
