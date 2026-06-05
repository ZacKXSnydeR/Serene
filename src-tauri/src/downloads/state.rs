use super::models::Track;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct LibraryState {
    pub file_path: PathBuf,
    pub tracks: Arc<RwLock<HashMap<String, Track>>>,
}

impl LibraryState {
    pub async fn new(app_dir: &Path) -> Self {
        let file_path = app_dir.join("library.json");
        let tracks = if file_path.exists() {
            let data = tokio::fs::read_to_string(&file_path).await.unwrap_or_else(|_| "{}".to_string());
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            HashMap::new()
        };

        Self {
            file_path,
            tracks: Arc::new(RwLock::new(tracks)),
        }
    }

    pub async fn save(&self) -> Result<(), String> {
        let tracks = self.tracks.read().await;
        let data = serde_json::to_string_pretty(&*tracks).map_err(|e| e.to_string())?;
        
        let tmp_path = self.file_path.with_extension("tmp.json");
        tokio::fs::write(&tmp_path, data).await.map_err(|e| e.to_string())?;
        tokio::fs::rename(&tmp_path, &self.file_path).await.map_err(|e| e.to_string())?;
        
        Ok(())
    }

    pub async fn update_track(&self, track: Track) -> Result<(), String> {
        {
            let mut tracks = self.tracks.write().await;
            tracks.insert(track.yt_id.clone(), track);
        }
        self.save().await
    }
}
