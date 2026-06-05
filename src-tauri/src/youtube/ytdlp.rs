use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Detects which browser is available for cookie extraction.
/// Tries Chrome → Edge → Firefox in order.
#[tauri::command]
pub async fn youtube_detect_browser() -> Result<String, String> {
    // On Windows, check common browser data directories
    let home = std::env::var("LOCALAPPDATA").unwrap_or_default();
    
    if std::path::Path::new(&format!("{}/BraveSoftware/Brave-Browser/User Data", home)).exists() {
        return Ok("brave".to_string());
    }
    if std::path::Path::new(&format!("{}/Google/Chrome/User Data", home)).exists() {
        return Ok("chrome".to_string());
    }
    if std::path::Path::new(&format!("{}/Microsoft/Edge/User Data", home)).exists() {
        return Ok("edge".to_string());
    }
    
    let roaming = std::env::var("APPDATA").unwrap_or_default();
    if std::path::Path::new(&format!("{}/Mozilla/Firefox/Profiles", roaming)).exists() {
        return Ok("firefox".to_string());
    }
    
    Err("No supported browser with cookies found. Please install Chrome, Edge, Firefox, or Brave and sign in to YouTube.".to_string())
}

/// Extracts a direct audio stream URL from a YouTube video using yt-dlp.
#[tauri::command]
pub async fn youtube_extract_audio(
    app: AppHandle,
    video_id: String,
    browser: String,
) -> Result<String, String> {
    let url = format!("https://www.youtube.com/watch?v={}", video_id);
    
    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to find yt-dlp sidecar: {}", e))?
        .args([
            "-f", "bestaudio",
            "-g",
            "--no-warnings",
            "--no-playlist",
            &url,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp error: {}", stderr.trim()));
    }

    let audio_url = String::from_utf8_lossy(&output.stdout).trim().to_string();
    
    if audio_url.is_empty() {
        return Err("yt-dlp returned empty audio URL".to_string());
    }

    Ok(audio_url)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct YtDlpMetadata {
    pub title: String,
    pub uploader: String,
    pub duration: f64,
    pub thumbnail: String,
    pub description: String,
    pub view_count: Option<u64>,
    pub upload_date: Option<String>,
    pub categories: Vec<String>,
    pub tags: Vec<String>,
    pub has_chapters: bool,
    pub channel_id: Option<String>,
}

#[tauri::command]
pub async fn youtube_get_metadata(
    app: AppHandle,
    video_id: String,
    browser: String,
) -> Result<YtDlpMetadata, String> {
    let url = format!("https://www.youtube.com/watch?v={}", video_id);

    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Failed to find yt-dlp sidecar: {}", e))?
        .args([
            "--dump-json",
            "--skip-download",
            "--no-warnings",
            "--no-playlist",
            &url,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp metadata error: {}", stderr.trim()));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse yt-dlp JSON: {}", e))?;

    let categories = json["categories"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    let tags = json["tags"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    let has_chapters = json["chapters"].as_array().map(|a| !a.is_empty()).unwrap_or(false);

    Ok(YtDlpMetadata {
        title: json["title"].as_str().unwrap_or("Unknown").to_string(),
        uploader: json["uploader"].as_str().unwrap_or("Unknown").to_string(),
        duration: json["duration"].as_f64().unwrap_or(0.0),
        thumbnail: json["thumbnail"].as_str().unwrap_or("").to_string(),
        description: json["description"].as_str().unwrap_or("").to_string(),
        view_count: json["view_count"].as_u64(),
        upload_date: json["upload_date"].as_str().map(|s| s.to_string()),
        categories,
        tags,
        has_chapters,
        channel_id: json["channel_id"].as_str().map(String::from),
    })
}
