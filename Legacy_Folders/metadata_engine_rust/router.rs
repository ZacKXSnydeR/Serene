use crate::metadata_engine::types::{ContentType, ResolutionInput};

pub fn classify(input: &ResolutionInput) -> ContentType {
    // Tier 1: YouTube category — strongest signal, set by YouTube itself
    if input.yt_categories.iter().any(|c| c.eq_ignore_ascii_case("Music")) {
        return ContentType::MusicTrack;
    }

    // Tier 2: Channel tabs — verified by YouTube at the channel level
    if input.channel_details.tabs.iter().any(|t| t.eq_ignore_ascii_case("Podcasts")) {
        return ContentType::Podcast;
    }
    if input.channel_details.tabs.iter().any(|t| t.eq_ignore_ascii_case("Music")) {
        return ContentType::MusicTrack;
    }

    // Tier 3: Creator-provided video tags
    let tags_lower: Vec<String> = input.yt_tags.iter().map(|t| t.to_lowercase()).collect();

    if tags_lower.iter().any(|t| {
        t.contains("podcast") || t.contains(" ep ") || t.contains("episode") || t.contains("interview")
    }) {
        return ContentType::Podcast;
    }

    if tags_lower.iter().any(|t| {
        t.contains("audio story")
            || t.contains("audio drama")
            || t.contains("radio play")
            || t.contains("suspense")
            || t.contains("horror story")
            || t.contains("bhuter golpo")
            || t.contains("golpo")
    }) {
        return ContentType::AudioStory;
    }

    // Tier 4: Duration + structural signals
    if input.has_chapters {
        if input.duration.unwrap_or(0.0) > 1200.0 {
            return ContentType::AudioStory;
        }
    }

    if input.duration.unwrap_or(0.0) > 1800.0 {
        return ContentType::AudioStory;
    }

    // Tier 5: Title pattern (weakest — last resort)
    if has_music_separator(&input.title) {
        return ContentType::MusicTrack;
    }

    // Short video with no specific signals → attempt music pipeline, fall back on low confidence
    if input.duration.unwrap_or(0.0) < 600.0 {
        return ContentType::MusicTrack;
    }

    ContentType::Unknown
}

fn has_music_separator(title: &str) -> bool {
    // Matches patterns like "Artist - Song", "Artist – Song", "Artist | Song"
    let has_dash = title.contains(" - ") || title.contains(" – ") || title.contains(" — ");
    let has_pipe = title.contains(" | ");
    has_dash || has_pipe
}
