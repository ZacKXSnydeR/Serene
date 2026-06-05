use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DownloadStatus {
    Pending,
    Downloading,
    Completed,
    Failed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub yt_id: String,
    pub title: String,
    pub artist: String,
    pub duration: f64,
    pub audio_path: Option<String>,
    pub poster_path: Option<String>,
    pub download_date: u64,
    pub status: DownloadStatus,
}
