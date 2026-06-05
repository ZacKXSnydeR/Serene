use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Serialize, Deserialize)]
pub struct YouTubeSearchResult {
    pub id: String,
    pub title: String,
    pub thumbnail: String,
    pub duration: String,
    pub uploader: String,
    pub uploader_id: Option<String>,
    pub views: String,
    pub result_type: String, // "song", "video", "artist", "playlist", "album"
    pub browse_id: Option<String>, // ID for Artist/Playlist pages
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YouTubeArtistDetails {
    pub name: String,
    pub description: String,
    pub image: String,
    pub top_songs: Vec<YouTubeSearchResult>,
    pub albums: Vec<YouTubeSearchResult>,
    pub singles: Vec<YouTubeSearchResult>,
    pub views: Option<String>,
}

#[tauri::command]
pub async fn generic_youtube_search(query: String) -> Result<Vec<YouTubeSearchResult>, String> {
    let client = Client::new();
    let res = client
        .post("https://www.youtube.com/youtubei/v1/search")
        .json(&json!({
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": "2.20230301.00.00"
                }
            },
            "query": query
        }))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let json: Value = res.json().await.map_err(|e| format!("JSON parsing error: {}", e))?;

    let mut results = Vec::new();

    // Traverse the complex InnerTube JSON structure
    if let Some(contents) = json
        .pointer("/contents/twoColumnSearchResultsRenderer/primaryContents/sectionListRenderer/contents")
        .and_then(|v| v.as_array())
    {
        for section in contents {
            if let Some(item_section) = section.get("itemSectionRenderer") {
                if let Some(items) = item_section.get("contents").and_then(|v| v.as_array()) {
                    for item in items {
                        if let Some(video) = item.get("videoRenderer") {
                            let id = video
                                .get("videoId")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            
                            // Extract title
                            let title = video
                                .pointer("/title/runs/0/text")
                                .and_then(|v| v.as_str())
                                .unwrap_or("Unknown")
                                .to_string();

                            // Extract the highest resolution thumbnail available
                            let thumbnail = video
                                .pointer("/thumbnail/thumbnails")
                                .and_then(|v| v.as_array())
                                .and_then(|arr| arr.last()) // Usually the last one is highest res
                                .and_then(|thumb| thumb.get("url"))
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();

                            // Extract duration
                            let duration = video
                                .pointer("/lengthText/simpleText")
                                .and_then(|v| v.as_str())
                                .unwrap_or("0:00")
                                .to_string();
                                
                            // Extract uploader name
                            let uploader = video
                                .pointer("/ownerText/runs/0/text")
                                .and_then(|v| v.as_str())
                                .unwrap_or("Unknown")
                                .to_string();

                            // Extract views
                            let views = video
                                .pointer("/shortViewCountText/simpleText")
                                .or_else(|| video.pointer("/viewCountText/simpleText"))
                                .and_then(|v| v.as_str())
                                .unwrap_or("Unknown views")
                                .to_string();

                            if !id.is_empty() {
                                results.push(YouTubeSearchResult {
                                    id,
                                    title,
                                    thumbnail,
                                    duration,
                                    uploader,
                                    uploader_id: None,
                                    views,
                                    result_type: "video".to_string(),
                                    browse_id: None,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(results)
}

pub async fn ytmusic_search(query: String) -> Result<Vec<YouTubeSearchResult>, String> {
    let client = Client::new();
    let body = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240918.01.00"
            }
        },
        "query": query
    });

    let res = client
        .post("https://music.youtube.com/youtubei/v1/search")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: Value = res.json().await.map_err(|e| e.to_string())?;
    let mut results = Vec::new();

    if let Some(contents) = json
        .pointer("/contents/tabbedSearchResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents")
        .and_then(|v| v.as_array())
    {
        for section in contents {
            let mut items_to_parse = None;

            if let Some(shelf) = section.get("musicShelfRenderer") {
                items_to_parse = shelf.get("contents").and_then(|v| v.as_array());
            } else if let Some(card_shelf) = section.get("musicCardShelfRenderer") {
                // The Top Result is the card itself!
                let id = card_shelf.pointer("/onTap/watchEndpoint/videoId").and_then(|v| v.as_str()).unwrap_or("");
                let title = card_shelf.pointer("/title/runs/0/text").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                let subtitle_runs = card_shelf.pointer("/subtitle/runs").and_then(|v| v.as_array());
                let mut uploader = "Unknown".to_string();
                let mut views = String::new();
                let mut category = String::new();
                
                if let Some(runs) = subtitle_runs {
                    if let Some(first_run) = runs.first() {
                        category = first_run.get("text").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
                    }
                    if runs.len() > 2 {
                        uploader = runs.get(2).and_then(|v| v.get("text")).and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                    }
                    if runs.len() > 4 {
                        views = runs.get(4).and_then(|v| v.get("text")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                    }
                }

                let thumbnail = card_shelf
                    .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr.last())
                    .and_then(|thumb| thumb.get("url"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let browse_id = card_shelf
                    .pointer("/title/runs/0/navigationEndpoint/browseEndpoint/browseId")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let result_type = match category.as_str() {
                    "artist" => "artist".to_string(),
                    "song" => "song".to_string(),
                    "album" | "single" | "ep" => "album".to_string(),
                    "video" => "video".to_string(),
                    "playlist" => "playlist".to_string(),
                    "podcast" => "podcast".to_string(),
                    "episode" => "episode".to_string(),
                    _ => {
                        if !id.is_empty() {
                            "song".to_string()
                        } else if let Some(ref bid) = browse_id {
                            if bid.starts_with("UC") || bid.starts_with("MPLA") {
                                "artist".to_string()
                            } else if bid.starts_with("MPRE") {
                                "album".to_string()
                            } else if bid.starts_with("VL") || bid.starts_with("RD") || bid.starts_with("VM") {
                                "playlist".to_string()
                            } else {
                                "artist".to_string()
                            }
                        } else {
                            "song".to_string()
                        }
                    }
                };

                if !id.is_empty() || browse_id.is_some() {
                    results.push(YouTubeSearchResult {
                        id: id.to_string(),
                        title,
                        thumbnail,
                        duration: "".to_string(),
                        uploader,
                        uploader_id: None,
                        views,
                        result_type,
                        browse_id,
                    });
                }
                
                // Card shelf also has contents (e.g. "More from YouTube")
                items_to_parse = card_shelf.get("contents").and_then(|v| v.as_array());
            } else if let Some(item_section) = section.get("itemSectionRenderer") {
                items_to_parse = item_section.get("contents").and_then(|v| v.as_array());
            }

            if let Some(items) = items_to_parse {
                for item in items {
                    if let Some(renderer) = item.get("musicResponsiveListItemRenderer") {
                        let id = renderer
                            .pointer("/playlistItemData/videoId")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        let browse_id_val = renderer
                            .pointer("/navigationEndpoint/browseEndpoint/browseId")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        let page_type = renderer
                            .pointer("/navigationEndpoint/browseEndpoint/browseEndpointContextSupportedConfigs/browseEndpointContextMusicConfig/pageType")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");

                        let mut result_type = "song".to_string();
                        if page_type == "MUSIC_PAGE_TYPE_ARTIST" || page_type == "MUSIC_PAGE_TYPE_USER_CHANNEL" {
                            result_type = "artist".to_string();
                        } else if page_type == "MUSIC_PAGE_TYPE_PLAYLIST" {
                            result_type = "playlist".to_string();
                        } else if page_type == "MUSIC_PAGE_TYPE_ALBUM" {
                            result_type = "album".to_string();
                        } else if page_type == "MUSIC_PAGE_TYPE_PODCAST_SHOW_DETAIL_PAGE" {
                            result_type = "podcast".to_string();
                        } else if page_type.is_empty() {
                            if let Some(ref bid) = browse_id_val {
                                if bid.starts_with("UC") || bid.starts_with("MPLA") {
                                    result_type = "artist".to_string();
                                } else if bid.starts_with("MPRE") {
                                    result_type = "album".to_string();
                                } else if bid.starts_with("VL") || bid.starts_with("RD") || bid.starts_with("VM") {
                                    result_type = "playlist".to_string();
                                }
                            }
                        }

                        let title = renderer
                            .pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Unknown")
                            .to_string();

                        let uploader = renderer
                            .pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs/2/text")
                            .or_else(|| renderer.pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("Unknown")
                            .to_string();

                        let uploader_id = renderer
                            .pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs/2/navigationEndpoint/browseEndpoint/browseId")
                            .or_else(|| renderer.pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs/0/navigationEndpoint/browseEndpoint/browseId"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        let views_or_album = renderer
                            .pointer("/flexColumns/2/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
                            .or_else(|| renderer.pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs/4/text"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        let thumbnail = renderer
                            .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
                            .and_then(|v| v.as_array())
                            .and_then(|arr| arr.last())
                            .and_then(|thumb| thumb.get("url"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        let duration = renderer
                            .pointer("/fixedColumns/0/musicResponsiveListItemFixedColumnRenderer/text/runs/0/text")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        if !id.is_empty() || browse_id_val.is_some() {
                            // Deduplicate by ID
                            if !results.iter().any(|r: &YouTubeSearchResult| (r.id == id && !id.is_empty()) || (r.browse_id == browse_id_val && browse_id_val.is_some())) {
                                results.push(YouTubeSearchResult {
                                    id,
                                    title,
                                    thumbnail,
                                    duration,
                                    uploader,
                                    uploader_id,
                                    views: views_or_album,
                                    result_type,
                                    browse_id: browse_id_val,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn youtube_search(query: String) -> Result<Vec<YouTubeSearchResult>, String> {
    let yt_future = generic_youtube_search(query.clone());
    let ytm_future = ytmusic_search(query);

    let (yt_res, ytm_res) = tokio::join!(yt_future, ytm_future);
    
    let mut yt_results = yt_res.unwrap_or_default();
    let mut ytm_results = ytm_res.unwrap_or_default();
    
    let mut combined = Vec::new();
    
    // Take up to first 4 from YT Music
    let take_count = std::cmp::min(4, ytm_results.len());
    for item in ytm_results.drain(0..take_count) {
        combined.push(item);
    }
    
    let mut yt_iter = yt_results.into_iter();
    let mut ytm_iter = ytm_results.into_iter();
    
    loop {
        let mut added = false;
        
        // Take 2 from YT Search
        for _ in 0..2 {
            if let Some(item) = yt_iter.next() {
                // Deduplicate
                if !item.id.is_empty() && !combined.iter().any(|r| r.id == item.id) {
                    combined.push(item);
                }
                added = true;
            }
        }
        
        // Take 2 from YT Music
        for _ in 0..2 {
            if let Some(item) = ytm_iter.next() {
                let is_dup = if !item.id.is_empty() {
                    combined.iter().any(|r| r.id == item.id)
                } else if let Some(ref bid) = item.browse_id {
                    combined.iter().any(|r| r.browse_id == Some(bid.clone()))
                } else {
                    false
                };
                
                if !is_dup {
                    combined.push(item);
                }
                added = true;
            }
        }
        
        if !added {
            break;
        }
    }

    Ok(combined)
}



#[tauri::command]
pub async fn ytmusic_get_artist(browse_id: String) -> Result<YouTubeArtistDetails, String> {
    let client = Client::new();
    let body = json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240918.01.00"
            }
        },
        "browseId": browse_id
    });

    let res = client
        .post("https://music.youtube.com/youtubei/v1/browse")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: Value = res.json().await.map_err(|e| e.to_string())?;

    let mut artist = YouTubeArtistDetails {
        name: String::new(),
        description: String::new(),
        image: String::new(),
        top_songs: Vec::new(),
        albums: Vec::new(),
        singles: Vec::new(),
        views: None,
    };

    if let Some(header) = json.pointer("/header/musicImmersiveHeaderRenderer") {
        artist.name = header.pointer("/title/runs/0/text").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if let Some(desc) = header.pointer("/description/runs/0/text") {
            artist.description = desc.as_str().unwrap_or("").to_string();
        }
        artist.image = header
            .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.last())
            .and_then(|thumb| thumb.get("url"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
    } else if let Some(header) = json.pointer("/header/musicVisualHeaderRenderer") {
        artist.name = header.pointer("/title/runs/0/text").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let sub1 = header.pointer("/subtitle/runs/0/text").and_then(|v| v.as_str()).unwrap_or("");
        let sub2 = header.pointer("/subtitle/runs/2/text").and_then(|v| v.as_str()).unwrap_or("");
        
        if !sub1.is_empty() {
            artist.views = Some(sub1.to_string());
        } else if !sub2.is_empty() {
            artist.views = Some(sub2.to_string());
        }
        
        artist.description = "".to_string(); // we don't have a real bio here usually
        
        artist.image = header
            .pointer("/foreground/croppedSquareImageRenderer/image/thumbnails")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.last())
            .and_then(|thumb| thumb.get("url"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
    } else if let Some(header) = json.pointer("/header/c4TabbedHeaderRenderer") {
        artist.name = header.pointer("/title").and_then(|v| v.as_str()).unwrap_or("").to_string();
        artist.views = header.pointer("/subscriberCountText/runs/0/text").and_then(|v| v.as_str()).map(|s| s.to_string());
        artist.description = "".to_string();
        artist.image = header
            .pointer("/avatar/thumbnails")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.last())
            .and_then(|thumb| thumb.get("url"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
    }

    let parse_items = |items: &Vec<Value>, result_type_hint: &str| -> Vec<YouTubeSearchResult> {
        let mut results = Vec::new();
        for item in items {
            if let Some(renderer) = item.get("musicResponsiveListItemRenderer") {
                let id = renderer
                    .pointer("/playlistItemData/videoId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let browse_id_val = renderer
                    .pointer("/navigationEndpoint/browseEndpoint/browseId")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let title = renderer
                    .pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown")
                    .to_string();

                let uploader = renderer
                    .pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs/2/text")
                    .or_else(|| renderer.pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown")
                    .to_string();

                let thumbnail = renderer
                    .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr.last())
                    .and_then(|thumb| thumb.get("url"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                    
                let views_or_album = renderer
                    .pointer("/flexColumns/2/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
                    .or_else(|| renderer.pointer("/flexColumns/1/musicResponsiveListItemFlexColumnRenderer/text/runs/4/text"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if !id.is_empty() || browse_id_val.is_some() {
                    results.push(YouTubeSearchResult {
                        id,
                        title,
                        thumbnail,
                        duration: "".to_string(),
                        uploader,
                        uploader_id: None,
                        views: views_or_album,
                        result_type: result_type_hint.to_string(),
                        browse_id: browse_id_val,
                    });
                }
            } else if let Some(renderer) = item.get("musicTwoRowItemRenderer") {
                let id = renderer
                    .pointer("/navigationEndpoint/watchEndpoint/videoId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let browse_id_val = renderer
                    .pointer("/navigationEndpoint/browseEndpoint/browseId")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                let title = renderer
                    .pointer("/title/runs/0/text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let subtitle = renderer
                    .pointer("/subtitle/runs/0/text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let mut thumbnail = renderer
                    .pointer("/thumbnailRenderer/musicThumbnailRenderer/thumbnail/thumbnails")
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr.last())
                    .and_then(|thumb| thumb.get("url"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                
                if thumbnail.is_empty() {
                    thumbnail = renderer
                        .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
                        .and_then(|v| v.as_array())
                        .and_then(|arr| arr.last())
                        .and_then(|thumb| thumb.get("url"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                }

                if thumbnail.is_empty() {
                    thumbnail = renderer
                        .pointer("/thumbnailRenderer/croppedSquareThumbnailRenderer/thumbnail/thumbnails")
                        .and_then(|v| v.as_array())
                        .and_then(|arr| arr.last())
                        .and_then(|thumb| thumb.get("url"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                }

                if !id.is_empty() || browse_id_val.is_some() {
                    results.push(YouTubeSearchResult {
                        id,
                        title,
                        thumbnail,
                        duration: "".to_string(),
                        uploader: subtitle,
                        uploader_id: None,
                        views: "".to_string(),
                        result_type: result_type_hint.to_string(),
                        browse_id: browse_id_val,
                    });
                }
            }
        }
        results
    };

    if let Some(contents) = json
        .pointer("/contents/singleColumnBrowseResultsRenderer/tabs/0/tabRenderer/content/sectionListRenderer/contents")
        .and_then(|v| v.as_array())
    {
        for section in contents {
            if let Some(shelf) = section.get("musicShelfRenderer") {
                let title = shelf.pointer("/title/runs/0/text").and_then(|v| v.as_str()).unwrap_or("");
                if title.to_lowercase().contains("songs") {
                    if let Some(items) = shelf.get("contents").and_then(|v| v.as_array()) {
                        artist.top_songs = parse_items(items, "song");
                    }
                }
            } else if let Some(carousel) = section.get("musicCarouselShelfRenderer") {
                let title = carousel.pointer("/header/musicCarouselShelfBasicHeaderRenderer/title/runs/0/text").and_then(|v| v.as_str()).unwrap_or("");
                if let Some(items) = carousel.get("contents").and_then(|v| v.as_array()) {
                    if title.to_lowercase().contains("album") {
                        artist.albums = parse_items(items, "album");
                    } else if title.to_lowercase().contains("single") || title.to_lowercase().contains("ep") {
                        artist.singles = parse_items(items, "album");
                    } else if title.to_lowercase().contains("latest") || title.to_lowercase().contains("podcast") {
                        // For channels, "Latest episodes" or "Podcasts" can go into singles or albums
                        let mut parsed = parse_items(items, "album");
                        artist.singles.append(&mut parsed);
                    }
                }
            }
        }
    }

    Ok(artist)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct YouTubeAlbumDetails {
    pub title: String,
    pub artist: String,
    pub year: String,
    pub track_count: String,
    pub thumbnail: String,
    pub tracks: Vec<YouTubeSearchResult>,
}

#[tauri::command]
pub async fn ytmusic_get_album(browse_id: String, title: String, artist: String, thumbnail: String) -> Result<YouTubeAlbumDetails, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "context": {
            "client": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20240918.01.00"
            }
        },
        "browseId": browse_id
    });

    let res = client
        .post("https://music.youtube.com/youtubei/v1/browse")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    
    let mut tracks = Vec::new();

    // Helper to recursively find musicResponsiveListItemRenderer
    fn extract_tracks(val: &serde_json::Value, tracks: &mut Vec<YouTubeSearchResult>) {
        if let Some(obj) = val.as_object() {
            if let Some(renderer) = obj.get("musicResponsiveListItemRenderer") {
                let id = renderer
                    .pointer("/playlistItemData/videoId")
                    .or_else(|| renderer.pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/navigationEndpoint/watchEndpoint/videoId"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let title = renderer
                    .pointer("/flexColumns/0/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown")
                    .to_string();

                let views = renderer
                    .pointer("/flexColumns/2/musicResponsiveListItemFlexColumnRenderer/text/runs/0/text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let duration = renderer
                    .pointer("/fixedColumns/0/musicResponsiveListItemFixedColumnRenderer/text/runs/0/text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if !id.is_empty() {
                    tracks.push(YouTubeSearchResult {
                        id,
                        title,
                        thumbnail: String::new(),
                        duration,
                        uploader: String::new(),
                        uploader_id: None,
                        views,
                        result_type: "song".to_string(),
                        browse_id: None,
                    });
                }
            } else {
                for (_, v) in obj {
                    extract_tracks(v, tracks);
                }
            }
        } else if let Some(arr) = val.as_array() {
            for v in arr {
                extract_tracks(v, tracks);
            }
        }
    }

    extract_tracks(&json, &mut tracks);

    Ok(YouTubeAlbumDetails {
        title,
        artist,
        year: "Album".to_string(),
        track_count: format!("{} songs", tracks.len()),
        thumbnail,
        tracks,
    })
}
