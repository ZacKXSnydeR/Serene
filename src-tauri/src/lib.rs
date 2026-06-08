mod db;

use serde_json::Value;
use tauri::{Manager, Emitter};
use tauri_plugin_shell::ShellExt;
use std::sync::{Arc, Mutex};
use tauri_plugin_shell::process::CommandEvent;
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

struct ServerPort(Arc<Mutex<Option<u16>>>);

#[tauri::command]
async fn get_server_port(state: tauri::State<'_, ServerPort>) -> Result<u16, String> {
    // Wait for the sidecar to report the port (timeout after 10s)
    for _ in 0..100 {
        if let Some(port) = *state.0.lock().unwrap() {
            return Ok(port);
        }
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    Err("Python sidecar failed to report port in time".to_string())
}

#[tauri::command]
async fn open_youtube_login(app: tauri::AppHandle, state: tauri::State<'_, ServerPort>) -> Result<(), String> {
    let port = if let Some(p) = *state.0.lock().unwrap() {
        p
    } else {
        return Err("Server port not initialized yet".to_string());
    };
    
    let data_dir = app.path().app_data_dir().unwrap().join("ytm_login_profile");
    
    let init_script = format!(r#"
        let checkInterval = setInterval(() => {{
            if (window.location.href.includes('music.youtube.com') && document.cookie.includes("SAPISID=")) {{
                clearInterval(checkInterval);
                setTimeout(() => {{
                    window.location.href = 'http://127.0.0.1:{}/auth/success_close_window';
                }}, 1500);
            }}
        }}, 1000);
    "#, port);

    let app_clone = app.clone();

    tauri::WebviewWindowBuilder::new(&app, "ytm-login", tauri::WebviewUrl::External("https://music.youtube.com".parse().unwrap()))
        .title("YouTube Music Login")
        .inner_size(800.0, 600.0)
        .incognito(true)
        .initialization_script(&init_script)
        .on_navigation(move |url| {
            if url.as_str().contains("auth/success_close_window") {
                let app = app_clone.clone();
                tauri::async_runtime::spawn(async move {
                    if let Some(w) = app.get_webview_window("ytm-login") {
                        if let Ok(cookies) = w.cookies_for_url("https://music.youtube.com".parse().unwrap()) {
                            let cookie_str = cookies.iter()
                                .map(|c| format!("{}={}", c.name(), c.value()))
                                .collect::<Vec<_>>()
                                .join("; ");
                            println!("Extracted cookies: {}", cookie_str);
                            
                            let client = reqwest::Client::new();
                            let api_url = format!("http://127.0.0.1:{}/auth/cookie", port);
                            let mut body = serde_json::Map::new();
                            body.insert("cookie".to_string(), serde_json::Value::String(cookie_str));
                            let _ = client.post(&api_url).json(&body).send().await;
                            
                            let _ = w.close();
                        } else {
                            let _ = w.close();
                        }
                    }
                    let _ = app.emit("auth-success", ());
                });
                false
            } else {
                true
            }
        })
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn admin_rpc(method: String, params: Option<Value>) -> Result<Value, String> {
    let client = reqwest::Client::new();
    let token = "cyrus-admin-123";
    let url = "http://localhost:18789/api/v1/admin/rpc";

    let mut body = serde_json::Map::new();
    body.insert("method".to_string(), Value::String(method));
    if let Some(p) = params {
        body.insert("params".to_string(), p);
    }

    let response = client
        .post(url)
        .header("Authorization", format!("Bearer {}", token))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json_response: Value = response.json().await.map_err(|e| e.to_string())?;

    if let Some(ok) = json_response.get("ok").and_then(|ok| ok.as_bool()) {
        if ok {
            if let Some(payload) = json_response.get("payload") {
                return Ok(payload.clone());
            }
            return Ok(Value::Null);
        } else {
            if let Some(err_msg) = json_response.get("error").and_then(|e| e.get("message")).and_then(|m| m.as_str()) {
                return Err(err_msg.to_string());
            }
            return Err("RPC call failed with unknown error".to_string());
        }
    }

    Err("Invalid response format from gateway".to_string())
}

#[tauri::command]
async fn fetch_web_data(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Request failed with status: {}", response.status()));
    }

    let text = response.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

struct DiscordState(Arc<Mutex<Option<DiscordIpcClient>>>);

#[tauri::command]
fn set_discord_presence(
    state: tauri::State<'_, DiscordState>,
    title: String,
    artist: String,
    album: String,
    elapsed: i64,
    poster_url: Option<String>
) {
    let mut client_opt = state.0.lock().unwrap();
    
    // Auto-reconnect or initialize if missing
    if client_opt.is_none() {
        if let Ok(mut new_client) = DiscordIpcClient::new("1513607760955052102") {
            if new_client.connect().is_ok() {
                *client_opt = Some(new_client);
            }
        }
    }

    if let Some(client) = client_opt.as_mut() {
        let current_time = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64;
        let start_time = current_time - elapsed;
        
        let mut payload = activity::Activity::new()
            .state(artist.as_str())
            .details(title.as_str())
            .timestamps(activity::Timestamps::new().start(start_time));
        
        let mut assets = activity::Assets::new()
            .large_text(album.as_str());

        if let Some(url) = &poster_url {
            assets = assets.large_image(url.as_str());
        } else {
            assets = assets.large_image("serene_logo");
        }
        
        // Small image for app icon (optional, we'll leave it empty to keep focus on album art)
        
        payload = payload.assets(assets);
        
        let _ = client.set_activity(payload);
    }
}

#[tauri::command]
fn clear_discord_presence(state: tauri::State<'_, DiscordState>) {
    let mut client_opt = state.0.lock().unwrap();
    if let Some(client) = client_opt.as_mut() {
        let _ = client.clear_activity();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            std::fs::create_dir_all(&app_dir).ok();

            // Init local database
            db::init_db(app.handle()).expect("Failed to initialize database");

            // Set up shared port state
            let port_state = Arc::new(Mutex::new(None));
            app.manage(ServerPort(port_state.clone()));

            // Set up Discord RPC state
            let discord_state = Arc::new(Mutex::new(None));
            app.manage(DiscordState(discord_state.clone()));

            // Spawn sidecar
            match app.shell().sidecar("ytmusic_server") {
                Ok(sidecar_command) => {
                    match sidecar_command.spawn() {
                        Ok((mut rx, _child)) => {
                            println!("Successfully spawned ytmusic_server sidecar");
                            tauri::async_runtime::spawn(async move {
                                while let Some(event) = rx.recv().await {
                                    if let CommandEvent::Stdout(line_bytes) = event {
                                        let line = String::from_utf8_lossy(&line_bytes);
                                        if let Some(port_str) = line.split("SERENE_PORT=").nth(1) {
                                            if let Ok(port) = port_str.trim().parse::<u16>() {
                                                println!("Captured Python server port: {}", port);
                                                *port_state.lock().unwrap() = Some(port);
                                            }
                                        }
                                    } else if let CommandEvent::Stderr(line_bytes) = event {
                                        let line = String::from_utf8_lossy(&line_bytes);
                                        eprintln!("Sidecar error: {}", line);
                                    }
                                }
                            });
                        }
                        Err(e) => {
                            eprintln!("Failed to spawn ytmusic_server sidecar: {}", e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Failed to configure sidecar command: {}", e);
                }
            }

            Ok(())
        })
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            fetch_web_data,
            open_youtube_login,
            get_server_port,
            db::add_local_history,
            db::get_local_history,
            db::clear_local_history,
            db::add_local_liked_song,
            db::remove_local_liked_song,
            db::get_local_liked_songs,
            db::clear_local_liked_songs,
            db::create_local_playlist,
            db::add_to_local_playlist,
            db::get_local_playlists,
            db::clear_local_playlists,
            set_discord_presence,
            clear_discord_presence
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
