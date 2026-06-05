use reqwest::Client;
use serde_json::{json, Value};
use tokio::time::{sleep, Duration};

use crate::metadata_engine::types::{NormalizedQuery, SourceCandidate};

const USER_AGENT: &str = "Serene/1.0 (github.com/serene-app; metadata-engine)";

pub async fn fetch_all(
    client: &Client,
    query: &NormalizedQuery,
    source_duration: Option<f64>,
) -> Vec<SourceCandidate> {
    let q = query.clone();
    let dur = source_duration;
    let c = client.clone();

    let (ytm, mb, dz, wiki) = tokio::join!(
        fetch_ytmusic(&c, &q),
        fetch_musicbrainz(&c, &q),
        fetch_deezer(&c, &q, dur),
        fetch_wikipedia(&c, &q),
    );

    let mut results = Vec::new();
    if let Some(r) = ytm   { results.push(r); }
    if let Some(r) = mb    { results.push(r); }
    if let Some(r) = dz    { results.push(r); }
    if let Some(r) = wiki  { results.push(r); }
    results
}

// ─── YouTube Music (InnerTube WEB_REMIX) ────────────────────────────────────

async fn fetch_ytmusic(client: &Client, query: &NormalizedQuery) -> Option<SourceCandidate> {
    let search_term = if query.artist.is_empty() {
        query.title.clone()
    } else {
        format!("{} {}", query.title, query.artist)
    };

    let body = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240918.01.00"
            }
        },
        "query": search_term
    });

    let resp = client
        .post("https://music.youtube.com/youtubei/v1/search")
        .header("User-Agent", USER_AGENT)
        .header("Content-Type", "application/json")
        .header("X-Origin", "https://music.youtube.com")
        .header("Referer", "https://music.youtube.com/")
        .json(&body)
        .send()
        .await
        .ok()?;

    let json: Value = resp.json().await.ok()?;

    // Walk the music shelf contents
    let contents = json
        .pointer("/contents/tabbedSearchResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents")?
        .as_array()?;

    for section in contents {
        if let Some(shelf) = section.get("musicShelfRenderer") {
            let shelf_title = shelf
                .pointer("/title/runs/0/text")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            // Only look at the Songs shelf
            if !shelf_title.eq_ignore_ascii_case("Songs") {
                continue;
            }

            if let Some(items) = shelf.get("contents").and_then(|v| v.as_array()) {
                if let Some(first) = items.first() {
                    return parse_ytmusic_item(first);
                }
            }
        }
    }

    None
}

fn parse_ytmusic_item(item: &Value) -> Option<SourceCandidate> {
    let renderer = item.get("musicResponsiveListItemRenderer")?;

    let title = renderer
        .pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
        .and_then(|v| v.as_str())?
        .to_string();

    let artist = renderer
        .pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let album = renderer
        .pointer("/flexColumns/2/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
        .and_then(|v| v.as_str())
        .map(String::from);

    let duration_str = renderer
        .pointer("/fixedColumns/0/musicResponsiveListItemFixedColumnRenderer/text/runs/0/text")
        .and_then(|v| v.as_str());

    let duration = duration_str.and_then(parse_duration_str);

    let thumbnail = renderer
        .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.last())
        .and_then(|t| t.get("url"))
        .and_then(|v| v.as_str())
        .map(String::from);

    Some(SourceCandidate {
        source: "ytmusic".to_string(),
        title,
        artist,
        artist_bio: None,
        album,
        genre: None,
        year: None,
        poster: thumbnail,
        artist_image: None,
        duration,
        isrc: None,
        musicbrainz_id: None,
        score: 0.0,
    })
}

// ─── MusicBrainz ────────────────────────────────────────────────────────────

async fn fetch_musicbrainz(client: &Client, query: &NormalizedQuery) -> Option<SourceCandidate> {
    // MusicBrainz requires 1 req/sec
    sleep(Duration::from_millis(300)).await;

    let q_str = if query.artist.is_empty() {
        format!("recording:\"{}\"", query.title)
    } else {
        format!("recording:\"{}\" AND artist:\"{}\"", query.title, query.artist)
    };

    let resp = client
        .get("https://musicbrainz.org/ws/2/recording/")
        .header("User-Agent", USER_AGENT)
        .query(&[("query", &q_str), ("fmt", &"json".to_string()), ("limit", &"5".to_string())])
        .send()
        .await
        .ok()?;

    let json: Value = resp.json().await.ok()?;
    let mut recordings_array = json.get("recordings").and_then(|v| v.as_array()).cloned().unwrap_or_default();

    // Fallback to title-only if we got no results and artist wasn't empty
    if recordings_array.is_empty() && !query.artist.is_empty() {
        sleep(Duration::from_millis(300)).await;
        let q_fallback = format!("recording:\"{}\"", query.title);
        if let Ok(resp) = client
            .get("https://musicbrainz.org/ws/2/recording/")
            .header("User-Agent", USER_AGENT)
            .query(&[("query", &q_fallback), ("fmt", &"json".to_string()), ("limit", &"5".to_string())])
            .send()
            .await
        {
            if let Ok(fallback_json) = resp.json::<Value>().await {
                if let Some(arr) = fallback_json.get("recordings").and_then(|v| v.as_array()) {
                    recordings_array = arr.clone();
                }
            }
        }
    }

    if recordings_array.is_empty() {
        return None;
    }

    // Pick the highest-score recording
    let best = recordings_array.iter().max_by(|a, b| {
        let sa = a["score"].as_u64().unwrap_or(0);
        let sb = b["score"].as_u64().unwrap_or(0);
        sa.cmp(&sb)
    })?;

    let mb_score = best["score"].as_u64().unwrap_or(0);
    if mb_score < 60 {
        return None; // Low confidence result, skip
    }

    let title = best["title"].as_str().unwrap_or("").to_string();
    let mbid = best["id"].as_str().map(String::from);

    let artist = best
        .pointer("/artist-credit/0/artist/name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let album = best
        .pointer("/releases/0/title")
        .and_then(|v| v.as_str())
        .map(String::from);

    let year = best
        .pointer("/releases/0/date")
        .and_then(|v| v.as_str())
        .and_then(|d| d.get(..4))
        .map(String::from);

    let duration = best["length"].as_f64().map(|ms| ms / 1000.0);

    // Fetch ISRC if we got an MBID
    let isrc = if let Some(ref id) = mbid {
        fetch_musicbrainz_isrc(client, id).await
    } else {
        None
    };

    Some(SourceCandidate {
        source: "musicbrainz".to_string(),
        title,
        artist,
        artist_bio: None,
        album,
        genre: None,
        year,
        poster: None,
        artist_image: None,
        duration,
        isrc,
        musicbrainz_id: mbid,
        score: 0.0,
    })
}

async fn fetch_musicbrainz_isrc(client: &Client, mbid: &str) -> Option<String> {
    sleep(Duration::from_millis(300)).await;

    let url = format!("https://musicbrainz.org/ws/2/recording/{}?inc=isrcs&fmt=json", mbid);
    let resp = client
        .get(&url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .ok()?;

    let json: Value = resp.json().await.ok()?;
    json["isrcs"]
        .as_array()?
        .first()
        .and_then(|v| v.as_str())
        .map(String::from)
}

// ─── Deezer ─────────────────────────────────────────────────────────────────

async fn fetch_deezer(
    client: &Client,
    query: &NormalizedQuery,
    source_duration: Option<f64>,
) -> Option<SourceCandidate> {
    let q = if query.artist.is_empty() {
        query.title.clone()
    } else {
        format!("track:\"{}\" artist:\"{}\"", query.title, query.artist)
    };

    let resp = client
        .get("https://api.deezer.com/search/track")
        .header("User-Agent", USER_AGENT)
        .query(&[("q", &q), ("limit", &"5".to_string())])
        .send()
        .await
        .ok()?;

    let json: Value = resp.json().await.ok()?;
    let mut tracks = json["data"].as_array().cloned().unwrap_or_default();

    if tracks.is_empty() && !query.artist.is_empty() {
        let q_fallback = query.title.clone();
        if let Ok(resp) = client
            .get("https://api.deezer.com/search/track")
            .header("User-Agent", USER_AGENT)
            .query(&[("q", &q_fallback), ("limit", &"5".to_string())])
            .send()
            .await
        {
            if let Ok(fallback_json) = resp.json::<Value>().await {
                if let Some(arr) = fallback_json["data"].as_array() {
                    tracks = arr.clone();
                }
            }
        }
    }

    if tracks.is_empty() {
        return None;
    }

    // If we have a source duration, pick the track with closest duration
    let best = if let Some(dur) = source_duration {
        tracks.iter().min_by(|a, b| {
            let da = (a["duration"].as_f64().unwrap_or(0.0) - dur).abs();
            let db = (b["duration"].as_f64().unwrap_or(0.0) - dur).abs();
            da.partial_cmp(&db).unwrap_or(std::cmp::Ordering::Equal)
        })?
    } else {
        tracks.first()?
    };

    let title = best["title"].as_str().unwrap_or("").to_string();
    let artist = best.pointer("/artist/name").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let album = best.pointer("/album/title").and_then(|v| v.as_str()).map(String::from);
    let duration = best["duration"].as_f64();

    // Deezer cover_xl is 1000x1000
    let poster = best.pointer("/album/cover_xl")
        .or_else(|| best.pointer("/album/cover_big"))
        .and_then(|v| v.as_str())
        .map(String::from);

    let artist_image = best.pointer("/artist/picture_xl")
        .or_else(|| best.pointer("/artist/picture_big"))
        .and_then(|v| v.as_str())
        .map(String::from);

    // Fetch genre via album endpoint
    let album_id = best.pointer("/album/id").and_then(|v| v.as_u64());
    let genre = if let Some(aid) = album_id {
        fetch_deezer_genre(client, aid).await
    } else {
        None
    };

    Some(SourceCandidate {
        source: "deezer".to_string(),
        title,
        artist,
        artist_bio: None,
        album,
        genre,
        year: None,
        poster,
        artist_image,
        duration,
        isrc: None,
        musicbrainz_id: None,
        score: 0.0,
    })
}

async fn fetch_deezer_genre(client: &Client, album_id: u64) -> Option<String> {
    let url = format!("https://api.deezer.com/album/{}", album_id);
    let resp = client
        .get(&url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .ok()?;

    let json: Value = resp.json().await.ok()?;
    json.pointer("/genres/data/0/name")
        .and_then(|v| v.as_str())
        .map(String::from)
}

// ─── Wikipedia ──────────────────────────────────────────────────────────────

async fn fetch_wikipedia(client: &Client, query: &NormalizedQuery) -> Option<SourceCandidate> {
    if query.artist.is_empty() {
        return None;
    }

    let (bio, image) = fetch_wikipedia_artist(client, &query.artist).await?;

    Some(SourceCandidate {
        source: "wikipedia".to_string(),
        title: query.title.clone(),
        artist: query.artist.clone(),
        artist_bio: Some(bio),
        album: None,
        genre: None,
        year: None,
        poster: None,
        artist_image: image,
        duration: None,
        isrc: None,
        musicbrainz_id: None,
        score: 0.0,
    })
}

/// Standalone artist bio lookup. Called by the orchestrator with the RESOLVED
/// artist name (from Deezer/MusicBrainz), not the YT channel name.
pub async fn fetch_artist_bio(client: &Client, artist_name: &str) -> Option<(String, Option<String>)> {
    fetch_wikipedia_artist(client, artist_name).await
}

/// Shared Wikipedia lookup. Returns (bio_extract, optional_image_url).
/// Rejects disambiguation pages and non-music-related results.
async fn fetch_wikipedia_artist(client: &Client, artist_name: &str) -> Option<(String, Option<String>)> {
    let url = format!(
        "https://en.wikipedia.org/api/rest_v1/page/summary/{}",
        urlencoding::encode(artist_name)
    );

    let resp = client
        .get(&url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let json: Value = resp.json().await.ok()?;

    // Reject disambiguation pages
    let page_type = json["type"].as_str().unwrap_or("");
    if page_type == "disambiguation" {
        return None;
    }

    let extract = json["extract"].as_str().unwrap_or("");
    if extract.is_empty() {
        return None;
    }

    // Reject if extract itself says "may refer to" (disambiguation variant)
    let extract_lower = extract.to_lowercase();
    if extract_lower.contains("may refer to") || extract_lower.contains("may also refer to") {
        return None;
    }

    // Check if it's music-related via description OR extract content
    let description = json["description"].as_str().unwrap_or("").to_lowercase();
    let is_music_related = description.contains("musician")
        || description.contains("singer")
        || description.contains("band")
        || description.contains("rapper")
        || description.contains("producer")
        || description.contains("artist")
        || description.contains("composer")
        || description.contains("songwriter")
        || description.contains("music group")
        || description.contains("record label")
        || description.contains("music label")
        || description.contains("music company")
        // Also check extract for music terms in case description is sparse
        || extract_lower.contains("is a musician")
        || extract_lower.contains("is a singer")
        || extract_lower.contains("is a band")
        || extract_lower.contains("music group")
        || extract_lower.contains("record label")
        || extract_lower.contains("is a rapper");

    if !is_music_related {
        return None;
    }

    let image = json
        .pointer("/thumbnail/source")
        .and_then(|v| v.as_str())
        .map(String::from);

    // Strip Wikipedia hatnotes from the extract
    // These are editorial notes like "Not to be confused with X."
    // or "For other uses, see X." that appear at the start
    let mut clean_extract = extract.to_string();
    let hatnote_prefixes = [
        "not to be confused with",
        "for other uses",
        "for the ",
        "this article is about",
        "\"",  // Quotes at start often indicate a redirect note
    ];
    
    // Remove lines that start with hatnote patterns
    let lines: Vec<&str> = clean_extract.split('\n').collect();
    let filtered: Vec<&str> = lines.iter()
        .filter(|line| {
            let trimmed = line.trim().to_lowercase();
            !hatnote_prefixes.iter().any(|prefix| trimmed.starts_with(prefix))
        })
        .copied()
        .collect();
    clean_extract = filtered.join("\n").trim().to_string();

    // Also strip inline hatnotes that might not be on separate lines
    // Pattern: sentence starting with "Not to be confused with" ending with period
    if let Some(idx) = clean_extract.to_lowercase().find("not to be confused with") {
        if idx < 5 {  // Only strip if it's near the start
            if let Some(end) = clean_extract[idx..].find('.') {
                clean_extract = clean_extract[idx + end + 1..].trim().to_string();
            }
        }
    }

    if clean_extract.is_empty() {
        return None;
    }

    // Truncate bio to ~600 chars at sentence boundary
    let bio = if clean_extract.len() > 600 {
        let truncated = &clean_extract[..600];
        if let Some(last_period) = truncated.rfind('.') {
            format!("{}.", &truncated[..last_period])
        } else {
            format!("{}...", truncated)
        }
    } else {
        clean_extract
    };

    Some((bio, image))
}

// ─── Channel Metadata ───────────────────────────────────────────────────────

pub async fn fetch_channel_details(client: &Client, channel_id: &str) -> crate::metadata_engine::types::ChannelDetails {
    let body = json!({
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": "2.20240918.00.00"
            }
        },
        "browseId": channel_id
    });

    let resp = match client
        .post("https://www.youtube.com/youtubei/v1/browse")
        .header("User-Agent", USER_AGENT)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
    {
        Ok(r) => r,
        Err(_) => return Default::default(),
    };

    let json: Value = match resp.json().await {
        Ok(v) => v,
        Err(_) => return Default::default(),
    };

    let header = json.pointer("/header/c4TabbedHeaderRenderer")
        .or_else(|| json.pointer("/header/pageHeaderRenderer"));

    let avatar = header
        .and_then(|h| h.pointer("/avatar/thumbnails").or_else(|| h.pointer("/content/pageHeaderViewModel/image/decoratedAvatarViewModel/avatar/avatarViewModel/image/sources")))
        .and_then(|arr| arr.as_array())
        .and_then(|arr| arr.last())
        .and_then(|t| t.get("url"))
        .and_then(|v| v.as_str())
        .map(String::from);

    let sub_count = header
        .and_then(|h| h.pointer("/subscriberCountText/simpleText").or_else(|| h.pointer("/content/pageHeaderViewModel/metadata/contentMetadataViewModel/metadataRows/1/metadataParts/0/text/content")))
        .and_then(|v| v.as_str())
        .map(String::from);

    let tabs: Vec<String> = json["header"]["c4TabbedHeaderRenderer"]["tabs"]
        .as_array()
        .or_else(|| json["tabs"].as_array())
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|tab| {
            tab.pointer("/tabRenderer/title")
                .and_then(|v| v.as_str())
                .map(String::from)
        })
        .collect();

    // To get description, we could need another request to /about tab, but for now we'll just check if it's in the initial response metadata
    let description = json
        .pointer("/metadata/channelMetadataRenderer/description")
        .and_then(|v| v.as_str())
        .map(String::from);

    crate::metadata_engine::types::ChannelDetails {
        tabs,
        avatar,
        description,
        sub_count,
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

fn parse_duration_str(s: &str) -> Option<f64> {
    let parts: Vec<&str> = s.split(':').collect();
    match parts.as_slice() {
        [m, s] => {
            let mins = m.parse::<f64>().ok()?;
            let secs = s.parse::<f64>().ok()?;
            Some(mins * 60.0 + secs)
        }
        [h, m, s] => {
            let hours = h.parse::<f64>().ok()?;
            let mins = m.parse::<f64>().ok()?;
            let secs = s.parse::<f64>().ok()?;
            Some(hours * 3600.0 + mins * 60.0 + secs)
        }
        _ => None,
    }
}

// Percent-encode for URL construction
mod urlencoding {
    pub fn encode(s: &str) -> String {
        s.chars().map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            ' ' => "_".to_string(),
            _ => format!("%{:02X}", c as u32),
        }).collect()
    }
}
