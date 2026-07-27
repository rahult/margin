use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

// Keep the backend child alive for the app's lifetime; dropping it on exit
// terminates the local proxy.
struct Backend(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_data = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data)?;
            let data_dir = app_data.join("data");
            std::fs::create_dir_all(&data_dir)?;
            let proxy = app.path().resource_dir()?.join("server").join("proxy.mjs");
            let (_rx, child) = app
                .shell()
                .sidecar("node")?
                .args([proxy.to_string_lossy().to_string()])
                .env("MARGIN_DATA_DIR", data_dir.to_string_lossy().to_string())
                .env("MARGIN_ENV_PATH", app_data.join(".env").to_string_lossy().to_string())
                .spawn()?;
            app.manage(Backend(Mutex::new(Some(child))));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Margin");
}
