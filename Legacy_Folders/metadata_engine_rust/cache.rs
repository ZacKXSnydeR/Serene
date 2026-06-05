use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, Result as SqlResult, params};
use sha2::{Sha256, Digest};

use crate::metadata_engine::types::ResolvedEntity;

const MUSIC_TTL_SECS: u64 = 30 * 24 * 60 * 60;   // 30 days
const CHANNEL_TTL_SECS: u64 = 7 * 24 * 60 * 60;   // 7 days

pub struct MetadataCache {
    conn: Mutex<Connection>,
}

impl MetadataCache {
    pub fn new(app_dir: &Path) -> SqlResult<Self> {
        let db_path = app_dir.join("metadata_cache.db");
        let conn = Connection::open(db_path)?;
        conn.execute_batch("
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS resolved_entities (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                cache_key    TEXT UNIQUE NOT NULL,
                content_type TEXT NOT NULL,
                data_json    TEXT NOT NULL,
                confidence   REAL NOT NULL,
                created_at   INTEGER NOT NULL,
                expires_at   INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_cache_key ON resolved_entities(cache_key);
            CREATE INDEX IF NOT EXISTS idx_expires   ON resolved_entities(expires_at);
        ")?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn make_key(title: &str, artist: &str) -> String {
        let raw = format!("{}|{}", title.trim().to_lowercase(), artist.trim().to_lowercase());
        let hash = Sha256::digest(raw.as_bytes());
        hex::encode(hash)
    }

    pub fn get(&self, key: &str) -> Option<ResolvedEntity> {
        let conn = self.conn.lock().ok()?;
        let now = now_secs();
        let result: SqlResult<String> = conn.query_row(
            "SELECT data_json FROM resolved_entities WHERE cache_key = ?1 AND expires_at > ?2",
            params![key, now as i64],
            |row| row.get(0),
        );
        result.ok().and_then(|json| serde_json::from_str(&json).ok())
    }

    pub fn put(&self, key: &str, entity: &ResolvedEntity, is_channel: bool) {
        let Ok(conn) = self.conn.lock() else { return };
        let Ok(json) = serde_json::to_string(entity) else { return };
        let now = now_secs() as i64;
        let ttl = if is_channel { CHANNEL_TTL_SECS } else { MUSIC_TTL_SECS } as i64;
        let _ = conn.execute(
            "INSERT INTO resolved_entities (cache_key, content_type, data_json, confidence, created_at, expires_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(cache_key) DO UPDATE SET
                data_json = excluded.data_json,
                confidence = excluded.confidence,
                created_at = excluded.created_at,
                expires_at = excluded.expires_at",
            params![key, format!("{:?}", entity.content_type), json, entity.confidence, now, now + ttl],
        );
    }

    pub fn sweep_expired(&self) {
        let Ok(conn) = self.conn.lock() else { return };
        let now = now_secs() as i64;
        let _ = conn.execute("DELETE FROM resolved_entities WHERE expires_at < ?1", params![now]);
    }
}

fn now_secs() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
}
