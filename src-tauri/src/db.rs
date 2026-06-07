use rusqlite::{Connection, Result};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct LocalTrack {
    pub video_id: String,
    pub title: String,
    pub artist: String,
    pub poster: String,
}

pub fn init_db(app: &AppHandle) -> Result<()> {
    let app_dir = app.path().app_data_dir().expect("Failed to get app data directory");
    let db_path = app_dir.join("local_library.sqlite");
    
    let conn = Connection::open(db_path)?;
    

    
    // Create tables
    conn.execute(
        "CREATE TABLE IF NOT EXISTS local_history (
            id INTEGER PRIMARY KEY,
            video_id TEXT NOT NULL UNIQUE,
            title TEXT,
            artist TEXT,
            poster TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS local_liked_songs (
            id INTEGER PRIMARY KEY,
            video_id TEXT NOT NULL UNIQUE,
            title TEXT,
            artist TEXT,
            poster TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS local_playlists (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            privacy_status TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS local_playlist_items (
            id INTEGER PRIMARY KEY,
            playlist_id TEXT NOT NULL,
            video_id TEXT NOT NULL,
            title TEXT,
            artist TEXT,
            poster TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(playlist_id) REFERENCES local_playlists(id) ON DELETE CASCADE,
            UNIQUE(playlist_id, video_id)
        )",
        [],
    )?;

    app.manage(DbState {
        conn: Mutex::new(conn),
    });

    Ok(())
}

// ------------------------------------
// History Commands
// ------------------------------------

#[tauri::command]
pub fn add_local_history(state: State<'_, DbState>, track: LocalTrack) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO local_history (video_id, title, artist, poster, timestamp) VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)",
        [&track.video_id, &track.title, &track.artist, &track.poster],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_local_history(state: State<'_, DbState>) -> Result<Vec<LocalTrack>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT video_id, title, artist, poster FROM local_history ORDER BY timestamp DESC")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(LocalTrack {
            video_id: row.get(0)?,
            title: row.get(1).unwrap_or_default(),
            artist: row.get(2).unwrap_or_default(),
            poster: row.get(3).unwrap_or_default(),
        })
    }).map_err(|e| e.to_string())?;
    
    let mut history = Vec::new();
    for row in rows {
        history.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(history)
}

#[tauri::command]
pub fn clear_local_history(state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM local_history", []).map_err(|e| e.to_string())?;
    Ok(())
}

// ------------------------------------
// Liked Songs Commands
// ------------------------------------

#[tauri::command]
pub fn add_local_liked_song(state: State<'_, DbState>, track: LocalTrack) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO local_liked_songs (video_id, title, artist, poster) VALUES (?1, ?2, ?3, ?4)",
        [&track.video_id, &track.title, &track.artist, &track.poster],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn remove_local_liked_song(state: State<'_, DbState>, video_id: String) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "DELETE FROM local_liked_songs WHERE video_id = ?1",
        [&video_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_local_liked_songs(state: State<'_, DbState>) -> Result<Vec<LocalTrack>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT video_id, title, artist, poster FROM local_liked_songs ORDER BY timestamp DESC")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(LocalTrack {
            video_id: row.get(0)?,
            title: row.get(1).unwrap_or_default(),
            artist: row.get(2).unwrap_or_default(),
            poster: row.get(3).unwrap_or_default(),
        })
    }).map_err(|e| e.to_string())?;
    
    let mut likes = Vec::new();
    for row in rows {
        likes.push(row.map_err(|e| e.to_string())?);
    }
    
    Ok(likes)
}

#[tauri::command]
pub fn clear_local_liked_songs(state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM local_liked_songs", []).map_err(|e| e.to_string())?;
    Ok(())
}

// ------------------------------------
// Playlists Commands
// ------------------------------------

#[derive(serde::Serialize)]
pub struct LocalPlaylist {
    pub id: String,
    pub title: String,
    pub description: String,
    pub privacy_status: String,
    pub tracks: Vec<LocalTrack>,
}

#[tauri::command]
pub fn create_local_playlist(state: State<'_, DbState>, title: String, description: String, privacy_status: String) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
    let id = format!("local_pl_{}", uuid::Uuid::new_v4().to_string().replace("-", "").chars().take(12).collect::<String>());
    
    conn.execute(
        "INSERT INTO local_playlists (id, title, description, privacy_status) VALUES (?1, ?2, ?3, ?4)",
        [&id, &title, &description, &privacy_status],
    ).map_err(|e| e.to_string())?;
    
    Ok(id)
}

#[tauri::command]
pub fn add_to_local_playlist(state: State<'_, DbState>, playlist_id: String, tracks: Vec<LocalTrack>) -> Result<(), String> {
    let mut conn = state.conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    for track in tracks {
        tx.execute(
            "INSERT OR REPLACE INTO local_playlist_items (playlist_id, video_id, title, artist, poster) VALUES (?1, ?2, ?3, ?4, ?5)",
            [&playlist_id, &track.video_id, &track.title, &track.artist, &track.poster],
        ).map_err(|e| e.to_string())?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_local_playlists(state: State<'_, DbState>) -> Result<Vec<LocalPlaylist>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, title, description, privacy_status FROM local_playlists ORDER BY timestamp DESC")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
        ))
    }).map_err(|e| e.to_string())?;
    
    let mut playlists = Vec::new();
    for row in rows {
        let (id, title, description, privacy_status) = row.map_err(|e| e.to_string())?;
        
        let mut item_stmt = conn.prepare("SELECT video_id, title, artist, poster FROM local_playlist_items WHERE playlist_id = ?1 ORDER BY timestamp ASC")
            .map_err(|e| e.to_string())?;
        
        let item_rows = item_stmt.query_map([&id], |r| {
            Ok(LocalTrack {
                video_id: r.get(0)?,
                title: r.get(1).unwrap_or_default(),
                artist: r.get(2).unwrap_or_default(),
                poster: r.get(3).unwrap_or_default(),
            })
        }).map_err(|e| e.to_string())?;
            
        let mut tracks = Vec::new();
        for v in item_rows {
            tracks.push(v.map_err(|e| e.to_string())?);
        }
        
        playlists.push(LocalPlaylist {
            id,
            title,
            description,
            privacy_status,
            tracks,
        });
    }
    
    Ok(playlists)
}

#[tauri::command]
pub fn clear_local_playlists(state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM local_playlists", []).map_err(|e| e.to_string())?;
    Ok(())
}
