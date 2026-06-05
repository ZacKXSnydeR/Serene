use std::path::Path;
use tokio::fs;

/// Checks for any orphaned `.tmp` files in the audio downloads directory
/// (usually caused by a power outage or app crash mid-download)
/// and removes them to maintain directory integrity.
pub async fn perform_startup_cleanup(app_dir: &Path) -> Result<(), String> {
    let audio_dir = app_dir.join("Downloads").join("Audio");
    
    if !audio_dir.exists() {
        return Ok(());
    }

    let mut entries = fs::read_dir(audio_dir).await.map_err(|e| e.to_string())?;
    
    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext == "tmp" {
                    println!("Cleaning up orphaned temporary file: {:?}", path);
                    let _ = fs::remove_file(path).await;
                }
            }
        }
    }

    Ok(())
}
