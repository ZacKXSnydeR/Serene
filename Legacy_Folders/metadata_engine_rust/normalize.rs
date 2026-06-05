use regex::Regex;
use std::sync::OnceLock;

use crate::metadata_engine::types::NormalizedQuery;

static JUNK_SUFFIX: OnceLock<Regex> = OnceLock::new();
static FEAT_PATTERN: OnceLock<Regex> = OnceLock::new();
static SEPARATOR: OnceLock<Regex> = OnceLock::new();
static VEVO_SUFFIX: OnceLock<Regex> = OnceLock::new();
static EXTRA_INFO: OnceLock<Regex> = OnceLock::new();

fn junk_suffix() -> &'static Regex {
    JUNK_SUFFIX.get_or_init(|| {
        Regex::new(
            r"(?i)\s*[\(\[]\s*(official\s*(music\s*)?video|official\s*audio|official\s*lyric|lyrics?\s*(video)?|hd|hq|4k|8k|full\s*(song|video)|audio|visualizer|animated\s*video|m/v|mv|slowed|reverb|sped\s*up)\s*[\)\]]"
        ).unwrap()
    })
}

fn feat_pattern() -> &'static Regex {
    FEAT_PATTERN.get_or_init(|| {
        Regex::new(r"(?i)\s*[\(\[]\s*(?:feat(?:uring)?|ft|with)\.?\s+([^\)\]]+)\s*[\)\]]").unwrap()
    })
}

fn separator() -> &'static Regex {
    SEPARATOR.get_or_init(|| {
        Regex::new(r"\s+(?:–|—|-)\s+|\s*\|\s+|\s+//\s+").unwrap()
    })
}

fn vevo_suffix() -> &'static Regex {
    VEVO_SUFFIX.get_or_init(|| {
        Regex::new(r"(?i)\s*vevo\s*$").unwrap()
    })
}

fn extra_info() -> &'static Regex {
    EXTRA_INFO.get_or_init(|| {
        Regex::new(
            r"(?i)\s*[\(\[]\s*(from\s+[^\)\]]+|video\s*song|bangla\s*song|hindi\s*song|full\s*song|bengali\s*song|movie\s*song|film\s*song|natok|full\s*natok|lyrical|new\s*song\s*\d*|song\s*\d{4})\s*[\)\]]"
        ).unwrap()
    })
}

pub fn normalize(raw_title: &str, raw_artist: &str) -> NormalizedQuery {
    let mut working = raw_title.to_string();

    // Extract featured artists before stripping
    let mut featured: Vec<String> = Vec::new();
    for cap in feat_pattern().captures_iter(&working.clone()) {
        if let Some(m) = cap.get(1) {
            featured.push(m.as_str().trim().to_string());
        }
    }
    working = feat_pattern().replace_all(&working, "").to_string();

    // Strip junk suffixes like (Official Video), [Lyrics], etc.
    working = junk_suffix().replace_all(&working, "").trim().to_string();

    // Strip extra info like (From Movie), [Bangla Song], etc.
    working = extra_info().replace_all(&working, "").trim().to_string();

    // Detect "Artist - Title" or "Artist | Title" separator in the title
    let (title, title_parsed_artist) = if let Some(parts) = separator().splitn(&working, 2).collect::<Vec<_>>().as_slice().get(..2) {
        let left = parts[0].trim();
        let right = parts[1].trim();
        // Heuristic: the shorter segment is more likely the artist, but if raw_artist
        // matches the left side better, use that ordering
        let artist_matches_left = jaro_winkler_simple(
            &raw_artist.to_lowercase(),
            &left.to_lowercase(),
        ) > 0.75;
        if artist_matches_left || left.len() <= right.len() {
            (right.to_string(), left.to_string())
        } else {
            (left.to_string(), right.to_string())
        }
    } else {
        (working.trim().to_string(), String::new())
    };

    // Decide the artist to use for API queries:
    // - If we parsed an artist from the title separator → use that (most reliable)
    // - If not, use the raw_artist (channel name) as a weak hint
    let artist_clean = if !title_parsed_artist.is_empty() {
        vevo_suffix().replace_all(&title_parsed_artist, "").trim().to_string()
    } else {
        vevo_suffix().replace_all(raw_artist, "").trim().to_string()
    };

    let title_lower = title.to_lowercase();
    let artist_lower = artist_clean.to_lowercase();
    let title_tokens = tokenize(&title_lower);

    NormalizedQuery {
        title,
        title_lower,
        artist: artist_clean,
        artist_lower,
        featured,
        title_tokens,
    }
}

pub fn tokenize(s: &str) -> Vec<String> {
    s.split_whitespace()
        .map(|w| w.trim_matches(|c: char| !c.is_alphanumeric()).to_lowercase())
        .filter(|w| w.len() > 1)
        .collect()
}

fn jaro_winkler_simple(a: &str, b: &str) -> f64 {
    strsim::jaro_winkler(a, b)
}
