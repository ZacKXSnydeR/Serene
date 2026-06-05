use reqwest::Client;
use std::fs::File;
use std::path::Path;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::task;

#[cfg(unix)]
use std::os::unix::fs::FileExt;
#[cfg(windows)]
use std::os::windows::fs::FileExt;

/// Cross-platform positional write wrapper.
/// This completely bypasses the need for Mutexes around the File handle,
/// allowing 4 threads to write to the exact memory offsets concurrently.
fn write_at_offset(file: &File, buf: &[u8], offset: u64) -> std::io::Result<usize> {
    #[cfg(unix)]
    {
        file.write_at(buf, offset)
    }
    #[cfg(windows)]
    {
        file.seek_write(buf, offset)
    }
}

pub struct DownloadProgress {
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

pub async fn download_file(
    url: &str,
    dest_path: &Path,
    progress_tx: mpsc::Sender<DownloadProgress>,
) -> Result<(), String> {
    let client = Client::new();
    
    // 1. Get Content Length
    let res = client.head(url).send().await.map_err(|e| e.to_string())?;
    let total_size = res.content_length().ok_or("Server did not return Content-Length")?;

    // 2. Preallocate the .tmp file
    let tmp_path = dest_path.with_extension("tmp");
    let file = File::create(&tmp_path).map_err(|e| e.to_string())?;
    
    // Instantly allocate the full space on disk to prevent fragmentation
    file.set_len(total_size).map_err(|e| e.to_string())?;
    
    let file = Arc::new(file);

    // 3. Define 4 chunks (Optimal for Audio)
    let threads = 4;
    let chunk_size = total_size / threads;
    let mut tasks = Vec::new();

    let downloaded_total = Arc::new(tokio::sync::Mutex::new(0u64));

    for i in 0..threads {
        let start = i * chunk_size;
        let end = if i == threads - 1 { total_size - 1 } else { (start + chunk_size) - 1 };
        
        let client_clone = client.clone();
        let url_clone = url.to_string();
        let file_clone = Arc::clone(&file);
        let progress_tx_clone = progress_tx.clone();
        let downloaded_total_clone = Arc::clone(&downloaded_total);

        let task = task::spawn(async move {
            let req = client_clone.get(&url_clone).header("Range", format!("bytes={}-{}", start, end));
            let mut response = req.send().await.map_err(|e| e.to_string())?;
            
            if !response.status().is_success() {
                return Err(format!("Failed to download chunk {}: {}", i, response.status()));
            }

            let mut current_offset = start;
            while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
                // Write directly to disk at the calculated offset (No Locks!)
                write_at_offset(&file_clone, &chunk, current_offset).map_err(|e| e.to_string())?;
                current_offset += chunk.len() as u64;

                let mut total_lock = downloaded_total_clone.lock().await;
                *total_lock += chunk.len() as u64;
                let current_total = *total_lock;
                drop(total_lock);

                // Ignore send errors if the receiver dropped
                let _ = progress_tx_clone.send(DownloadProgress {
                    downloaded_bytes: current_total,
                    total_bytes: total_size,
                }).await;
            }
            Ok::<(), String>(())
        });
        tasks.push(task);
    }

    // 4. Await all chunk tasks
    for task in tasks {
        task.await.map_err(|e| format!("Task paniced: {}", e))??;
    }

    // 5. Ensure all data is flushed and the file handle is dropped
    // before attempting to rename the file.
    drop(file);

    // 6. Atomic Rename (Failsafe mechanism)
    tokio::fs::rename(&tmp_path, dest_path).await.map_err(|e| e.to_string())?;

    Ok(())
}
