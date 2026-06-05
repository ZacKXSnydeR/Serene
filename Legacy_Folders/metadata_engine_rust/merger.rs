use crate::metadata_engine::types::{ContentType, EntityType, ResolvedEntity, SourceCandidate};

pub fn merge(
    candidates: &[SourceCandidate],
    raw_title: &str,
    raw_thumbnail: Option<String>,
) -> ResolvedEntity {
    let by_source = |source: &str| candidates.iter().find(|c| c.source == source);

    let mb   = by_source("musicbrainz");
    let dz   = by_source("deezer");
    let ytm  = by_source("ytmusic");
    let wiki = by_source("wikipedia");

    // Title: prefer the source with highest score, with MB > DZ > YTM as tiebreaker
    let title = first_nonempty([
        mb.map(|c| c.title.as_str()),
        dz.map(|c| c.title.as_str()),
        ytm.map(|c| c.title.as_str()),
        Some(raw_title),
    ]);

    // Artist: ISRC-matched source (highest score) > MB > DZ > YTM > title-parsed
    let best_scored = candidates.iter().max_by(|a, b| a.score.partial_cmp(&b.score).unwrap());
    let artist = first_nonempty([
        best_scored.filter(|c| c.score >= 0.9).map(|c| c.artist.as_str()),
        mb.map(|c| c.artist.as_str()),
        dz.map(|c| c.artist.as_str()),
        ytm.map(|c| c.artist.as_str()),
    ]);

    let album = first_nonempty_owned([
        mb.and_then(|c| c.album.as_deref()),
        dz.and_then(|c| c.album.as_deref()),
        ytm.and_then(|c| c.album.as_deref()),
    ]);

    let genre = first_nonempty_owned([
        dz.and_then(|c| c.genre.as_deref()),
        None,
    ]);

    let year = first_nonempty_owned([
        mb.and_then(|c| c.year.as_deref()),
        dz.and_then(|c| c.year.as_deref()),
    ]);

    // Poster: Deezer cover_xl > YTMusic thumbnail > raw YT thumbnail
    let poster = dz.and_then(|c| c.poster.clone())
        .or_else(|| ytm.and_then(|c| c.poster.clone()))
        .or(raw_thumbnail);

    let artist_image = dz.and_then(|c| c.artist_image.clone())
        .or_else(|| wiki.and_then(|c| c.artist_image.clone()));

    let artist_bio = wiki.and_then(|c| c.artist_bio.clone());

    let duration_seconds = dz.and_then(|c| c.duration)
        .or_else(|| mb.and_then(|c| c.duration))
        .or_else(|| ytm.and_then(|c| c.duration));

    let isrc = mb.and_then(|c| c.isrc.clone())
        .or_else(|| candidates.iter().find_map(|c| c.isrc.clone()));

    let musicbrainz_id = mb.and_then(|c| c.musicbrainz_id.clone());

    let confidence = best_scored.map(|c| c.score).unwrap_or(0.0);

    let sources_used: Vec<String> = candidates
        .iter()
        .filter(|c| c.score > 0.0)
        .map(|c| c.source.clone())
        .collect();

    ResolvedEntity {
        content_type: ContentType::MusicTrack,
        title,
        thumbnail: poster.clone(),
        confidence,
        sources_used,
        artist: Some(artist),
        artist_bio,
        album,
        genre,
        year,
        artist_image,
        duration_seconds,
        entity_type: Some(EntityType::Unknown),
        isrc,
        musicbrainz_id,
        channel_name: None,
        channel_avatar: None,
        channel_description: None,
        channel_subscriber_count: None,
        channel_content_type: None,
    }
}

pub fn merge_channel(
    channel_name: &str,
    channel_details: &crate::metadata_engine::types::ChannelDetails,
    raw_thumbnail: Option<String>,
    content_type: ContentType,
) -> ResolvedEntity {
    let channel_content_type = infer_channel_content_type(&channel_details.tabs);

    ResolvedEntity {
        content_type,
        title: channel_name.to_string(),
        thumbnail: raw_thumbnail.clone(),
        confidence: 0.8,
        sources_used: vec!["youtube_channel".to_string()],
        artist: None,
        artist_bio: None,
        album: None,
        genre: None,
        year: None,
        artist_image: None,
        duration_seconds: None,
        entity_type: Some(EntityType::Creator),
        isrc: None,
        musicbrainz_id: None,
        channel_name: Some(channel_name.to_string()),
        channel_avatar: channel_details.avatar.clone().or(raw_thumbnail),
        channel_description: channel_details.description.clone(),
        channel_subscriber_count: channel_details.sub_count.clone(),
        channel_content_type: Some(channel_content_type),
    }
}

pub fn infer_channel_content_type(tabs: &[String]) -> String {
    if tabs.iter().any(|t| t.eq_ignore_ascii_case("Podcasts")) {
        "podcast".to_string()
    } else if tabs.iter().any(|t| t.eq_ignore_ascii_case("Music")) {
        "music".to_string()
    } else {
        "mixed".to_string()
    }
}

fn first_nonempty<'a, const N: usize>(opts: [Option<&'a str>; N]) -> String {
    opts.iter()
        .flatten()
        .find(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_default()
}

fn first_nonempty_owned<const N: usize>(opts: [Option<&str>; N]) -> Option<String> {
    opts.iter()
        .flatten()
        .find(|s| !s.is_empty())
        .map(|s| s.to_string())
}
