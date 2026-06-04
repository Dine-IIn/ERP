#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
  app.restart();
}

#[tauri::command]
fn log_message(level: String, message: String) {
  match level.as_str() {
    "error" => eprintln!("[FRONTEND ERROR] {}", message),
    "warn" => println!("[FRONTEND WARN] {}", message),
    _ => println!("[FRONTEND INFO] {}", message),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_http::init())
    .invoke_handler(tauri::generate_handler![restart_app, log_message])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
