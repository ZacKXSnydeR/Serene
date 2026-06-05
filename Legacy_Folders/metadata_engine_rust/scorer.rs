use std::collections::HashSet;
use strsim::jaro_winkler;

use crate::metadata_engine::{normalize::tokenize, types::{NormalizedQuery, SourceCandidate}};

pub fn score_candidate(
    query: &NormalizedQuery,
    candidate: &SourceCandidate,
    all_isrcs: &HashSet<String>,
    source_duration: Option<f64>,
) -> f64 {
    let title_jw = jaro_winkler(&query.title_lower, &candidate.title.to_lowercase());
    let artist_jw = jaro_winkler(&query.artist_lower, &candidate.artist.to_lowercase());

    let dur_sim = match (source_duration, candidate.duration) {
        (Some(a), Some(b)) if a > 0.0 && b > 0.0 => {
            let diff = (a - b).abs();
            let max = a.max(b);
            (1.0 - diff / max).max(0.0)
        }
        _ => 0.5,
    };

    let cand_tokens: HashSet<String> = tokenize(&candidate.title.to_lowercase()).into_iter().collect();
    let query_tokens: HashSet<String> = query.title_tokens.iter().cloned().collect();
    let intersection = query_tokens.intersection(&cand_tokens).count();
    let union = query_tokens.union(&cand_tokens).count();
    let token_overlap = if union > 0 { intersection as f64 / union as f64 } else { 0.0 };

    let isrc_match = candidate
        .isrc
        .as_ref()
        .map(|isrc| if all_isrcs.contains(isrc) { 1.0 } else { 0.0 })
        .unwrap_or(0.0);

    let source_rel = match candidate.source.as_str() {
        "musicbrainz" => 1.0,
        "deezer"      => 0.9,
        "ytmusic"     => 0.7,
        "wikipedia"   => 0.5,
        _             => 0.3,
    };

    let raw = title_jw * 0.25
        + artist_jw * 0.20
        + dur_sim * 0.15
        + token_overlap * 0.15
        + isrc_match * 0.15
        + source_rel * 0.10;

    // If ISRC matched across multiple sources → floor confidence at 0.95
    if isrc_match > 0.0 { raw.max(0.95) } else { raw.min(1.0) }
}

pub fn collect_isrcs(candidates: &[SourceCandidate]) -> HashSet<String> {
    candidates
        .iter()
        .filter_map(|c| c.isrc.as_ref())
        .cloned()
        .collect()
}
