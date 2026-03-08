use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, StreamConfig};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use anyhow::Result;

pub struct ManagedStream(pub cpal::Stream);

unsafe impl Send for ManagedStream {}
unsafe impl Sync for ManagedStream {}

pub type AudioStreamState = Mutex<Option<ManagedStream>>;

#[tauri::command]
pub async fn start_audio_capture(app: AppHandle) -> Result<(), String> {
    let host = cpal::default_host();

    // On Ubuntu with PulseAudio/PipeWire, default input captures
    // system monitor if configured via pavucontrol
    let device = host
        .default_input_device()
        .ok_or("No input device found")?;

    println!("Using audio device: {}", device.name().unwrap_or_default());

    let config = device
        .default_input_config()
        .map_err(|e| e.to_string())?;

    let sample_rate = config.sample_rate().0;
    let app_clone = app.clone();

    let stream = match config.sample_format() {
        SampleFormat::F32 => build_stream::<f32>(&device, &config.into(), app_clone, sample_rate),
        SampleFormat::I16 => build_stream::<i16>(&device, &config.into(), app_clone, sample_rate),
        SampleFormat::U16 => build_stream::<u16>(&device, &config.into(), app_clone, sample_rate),
        _ => return Err("Unsupported sample format".to_string()),
    }
    .map_err(|e| e.to_string())?;

    stream.play().map_err(|e| e.to_string())?;

    let state = app.state::<AudioStreamState>();
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    *guard = Some(ManagedStream(stream));

    Ok(())
}

fn build_stream<T>(
    device: &cpal::Device,
    config: &StreamConfig,
    app: AppHandle,
    sample_rate: u32,
) -> Result<cpal::Stream>
where
    T: cpal::Sample + cpal::SizedSample + Send + 'static,
    f32: From<T>,
{
    let stream = device.build_input_stream(
        config,
        move |data: &[T], _: &cpal::InputCallbackInfo| {
            // Convert to i16 PCM for Deepgram
            let pcm: Vec<i16> = data
                .iter()
                .map(|s| {
                    let f: f32 = f32::from(*s);
                    (f * i16::MAX as f32).clamp(i16::MIN as f32, i16::MAX as f32) as i16
                })
                .collect();

            let bytes: Vec<u8> = pcm
                .iter()
                .flat_map(|s| s.to_le_bytes().to_vec())
                .collect();

            // Emit audio chunk to frontend
            let _ = app.emit(
                "audio-chunk",
                serde_json::json!({
                    "chunk": bytes,
                    "sampleRate": sample_rate,
                    "timestamp": std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis()
                }),
            );
        },
        |err| eprintln!("Audio stream error: {err}"),
        None,
    )?;

    Ok(stream)
}

#[tauri::command]
pub async fn stop_audio_capture(app: AppHandle) -> Result<(), String> {
    // Drop the stream to stop capture
    let state = app.state::<AudioStreamState>();
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    *guard = None;
    println!("Audio capture stopped");
    Ok(())
}

#[tauri::command]
pub async fn list_audio_devices() -> Result<Vec<String>, String> {
    let host = cpal::default_host();
    let devices = host
        .input_devices()
        .map_err(|e| e.to_string())?
        .filter_map(|d| d.name().ok())
        .collect();
    Ok(devices)
}