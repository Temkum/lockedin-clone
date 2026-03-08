mod audio;

use audio::{list_audio_devices, start_audio_capture, stop_audio_capture, AudioStreamState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(AudioStreamState::default())
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
    .invoke_handler(tauri::generate_handler![
        list_audio_devices,
        start_audio_capture,
        stop_audio_capture
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
