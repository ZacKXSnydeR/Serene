use serde_json::Value;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;



#[tauri::command]
async fn open_youtube_login(app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().unwrap().join("ytm_login_profile");
    tauri::WebviewWindowBuilder::new(&app, "ytm-login", tauri::WebviewUrl::External("https://music.youtube.com".parse().unwrap()))
        .title("YouTube Music Login")
        .inner_size(800.0, 600.0)
        .data_directory(data_dir)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            std::fs::create_dir_all(&app_dir).ok();

            // Spawn sidecar
            match app.shell().sidecar("ytmusic_server") {
                Ok(sidecar_command) => {
                    if let Err(e) = sidecar_command.spawn() {
                        eprintln!("Failed to spawn ytmusic_server sidecar: {}", e);
                    } else {
                        println!("Successfully spawned ytmusic_server sidecar");
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
            admin_rpc,
            fetch_web_data,
            open_youtube_login
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
