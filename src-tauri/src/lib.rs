mod commands;
mod db;
mod pricing;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Option<Connection>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            db: Mutex::new(None),
        })
        .setup(|app| {
            let conn = db::initialize(&app.handle());
            let state: tauri::State<AppState> = app.state();
            *state.db.lock().unwrap() = Some(conn);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::accounts::get_accounts,
            commands::accounts::create_account,
            commands::accounts::update_account,
            commands::accounts::delete_account,
            commands::holdings::get_holdings,
            commands::holdings::create_holding,
            commands::holdings::update_holding,
            commands::holdings::delete_holding,
            commands::prices::fetch_portfolio,
            commands::snapshots::get_snapshots,
            commands::export_import::export_data,
            commands::export_import::import_data,
            commands::csv_import::preview_csv_import,
            commands::csv_import::apply_csv_import,
            commands::mf_import::preview_mf_import,
            commands::mf_import::apply_mf_import,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
