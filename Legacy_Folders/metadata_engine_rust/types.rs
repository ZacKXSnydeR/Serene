use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ContentType {
    MusicTrack,
    Channel,
    AudioStory,
    Podcast,
    Unknown,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EntityType {
    SoloArtist,
    Band,
    Creator,
    Label,
    Unknown,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResolvedEntity {
    pub content_type: ContentType,
    pub title: String,
    pub thumbnail: Option<String>,
    pub confidence: f64,
    pub sources_used: Vec<String>,

    // Music-specific
    pub artist: Option<String>,
    pub artist_bio: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub year: Option<String>,
    pub artist_image: Option<String>,
    pub duration_seconds: Option<f64>,
    pub entity_type: Option<EntityType>,
    pub isrc: Option<String>,
    pub musicbrainz_id: Option<String>,

    // Channel-specific
    pub channel_name: Option<String>,
    pub channel_avatar: Option<String>,
    pub channel_description: Option<String>,
    pub channel_subscriber_count: Option<String>,
    pub channel_content_type: Option<String>,
}

/// Raw input passed from the frontend invoke call
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResolutionInput {
    pub title: String,
    pub artist: String,
    pub yt_id: Option<String>,
    pub duration: Option<f64>,
    pub yt_categories: Vec<String>,
    pub yt_tags: Vec<String>,
    pub has_chapters: bool,
    pub channel_id: Option<String>,
    pub channel_details: ChannelDetails,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ChannelDetails {
    pub tabs: Vec<String>,
    pub avatar: Option<String>,
    pub description: Option<String>,
    pub sub_count: Option<String>,
}

/// Cleaned and normalized query for API lookups
#[derive(Debug, Clone)]
pub struct NormalizedQuery {
    pub title: String,
    pub title_lower: String,
    pub artist: String,
    pub artist_lower: String,
    pub featured: Vec<String>,
    pub title_tokens: Vec<String>,
}

/// A candidate result from a single source before scoring
#[derive(Debug, Clone)]
pub struct SourceCandidate {
    pub source: String,
    pub title: String,
    pub artist: String,
    pub artist_bio: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub year: Option<String>,
    pub poster: Option<String>,
    pub artist_image: Option<String>,
    pub duration: Option<f64>,
    pub isrc: Option<String>,
    pub musicbrainz_id: Option<String>,
    pub score: f64,
}

impl SourceCandidate {
    pub fn empty(source: &str) -> Self {
        Self {
            source: source.to_string(),
            title: String::new(),
            artist: String::new(),
            artist_bio: None,
            album: None,
            genre: None,
            year: None,
            poster: None,
            artist_image: None,
            duration: None,
            isrc: None,
            musicbrainz_id: None,
            score: 0.0,
        }
    }
}
