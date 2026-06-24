mod adapters;
mod commands;
mod events;
mod process;
mod registry;
mod session;

use session::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::list_agents,
            commands::start_session,
            commands::send_message,
            commands::stop_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
