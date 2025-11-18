mod error;
mod paths;
mod preferences;
mod scrapers;
mod item_sets;
mod progress;

use preferences::Preferences;
use progress::ProgressTracker;
use item_sets::{build_to_item_set, write_item_set, delete_all_builds, count_builds};

use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
struct ImportPayload {
    sources: Vec<String>,
    options: HashMap<String, serde_json::Value>,
    path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ImportResult {
    success: bool,
    error: Option<String>,
    builds_imported: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct DeleteResult {
    success: bool,
    error: Option<String>,
    builds_deleted: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct CountResult {
    count: usize,
}

/// Generic response wrapper for all backend operations
#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse<T: Serialize> {
    success: bool,
    data: Option<T>,
    error: Option<error::ErrorResponse>,
}

// ============================================================================
// Preferences Commands
// ============================================================================

#[tauri::command]
async fn load_preferences() -> std::result::Result<preferences::PreferencesUI, String> {
    log::info!("Loading preferences for UI");
    let prefs = preferences::Preferences::load_ui().map_err(|e| e.to_string())?;
    Ok(prefs)
}

#[tauri::command]
async fn save_preferences(preferences: preferences::PreferencesUI) -> std::result::Result<(), String> {
    log::info!("Saving preferences from UI");
    preferences::Preferences::save_ui(preferences).map_err(|e| e.to_string())
}

// ============================================================================
// Path Detection Commands
// ============================================================================

#[tauri::command]
async fn find_lol_installation() -> std::result::Result<String, String> {
    log::info!("Finding LoL installation");
    let path = paths::find_lol_path().map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_item_sets_path(lol_path: Option<String>) -> std::result::Result<String, String> {
    log::info!("Getting item sets path");
    
    let lol_path = if let Some(path) = lol_path {
        PathBuf::from(path)
    } else {
        paths::find_lol_path().map_err(|e| e.to_string())?
    };
    
    let item_sets_path = paths::get_item_sets_path(&lol_path).map_err(|e| e.to_string())?;
    Ok(item_sets_path.to_string_lossy().to_string())
}

// ============================================================================
// Import/Scraping Commands
// ============================================================================

#[tauri::command]
async fn import_builds(
    app: AppHandle,
    payload: ImportPayload,
) -> std::result::Result<ImportResult, String> {
    log::info!("Starting build import from sources: {:?}", payload.sources);
    
    // Get LoL path
    let lol_path = if let Some(path) = payload.path {
        PathBuf::from(path)
    } else {
        paths::find_lol_path().map_err(|e| e.to_string())?
    };
    
    let item_sets_path = paths::get_item_sets_path(&lol_path).map_err(|e| e.to_string())?;
    
    // Create progress tracker
    let _progress = Arc::new(Mutex::new(ProgressTracker::new(app.clone())));
    
    // Create HTTP client
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    
    let mut total_builds = 0;
    
    // Iterate through each source
    for source_id in payload.sources {
        log::info!("Processing source: {}", source_id);
        
        // Emit progress to frontend
        let _ = app.emit("import-progress", json!({
            "source": source_id,
            "status": "fetching"
        }));
        
        // Get builds from source
        let version = get_version().await.map_err(|e| e.to_string())?;
        let builds = match source_id.as_str() {
            "ugg" => {
                scrapers::ugg::get_sr(&client, version.as_str(), "ranked_solo_5x5")
                    .await
                    .map_err(|e| e.to_string())?
            }
            "opgg" => {
                scrapers::opgg::get_sr(&client)
                    .await
                    .map_err(|e| e.to_string())?
            }
            "probuilds" => {
                scrapers::probuilds::get_sr(&client)
                    .await
                    .map_err(|e| e.to_string())?
            }
            "koreanbuilds" => {
                scrapers::koreanbuilds::get_sr(&client)
                    .await
                    .map_err(|e| e.to_string())?
            }
            _ => {
                log::warn!("Unknown source: {}", source_id);
                continue;
            }
        };
        
        log::info!("Fetched {} builds from {}", builds.len(), source_id);
        
        // Write builds to disk
        for (index, build_result) in builds.iter().enumerate() {
            // Convert BuildResult to Build format expected by item_sets
            let build = scrapers::types::Build {
                champion: build_result.champ.clone(),
                role: build_result.file_prefix.clone(),
                title: build_result.riot_json.title.clone(),
                items: build_result.riot_json.blocks.clone(),
                skills: None,
            };
            
            let item_set = build_to_item_set(&build);
            
            write_item_set(&item_sets_path, &build.champion, index, &item_set)
                .map_err(|e| e.to_string())?;
            
            total_builds += 1;
            
            // Update progress
            if total_builds % 10 == 0 {
                let _ = app.emit("import-progress", json!({
                    "source": source_id,
                    "status": "writing",
                    "count": total_builds
                }));
            }
        }
        
        let _ = app.emit("import-progress", json!({
            "source": source_id,
            "status": "complete",
            "count": builds.len()
        }));
    }
    
    log::info!("Import complete. Total builds imported: {}", total_builds);
    
    Ok(ImportResult {
        success: true,
        error: None,
        builds_imported: total_builds,
    })
}

// ============================================================================
// Build Management Commands
// ============================================================================

#[tauri::command]
async fn delete_builds(lol_path: Option<String>) -> std::result::Result<DeleteResult, String> {
    log::info!("Deleting all builds");
    
    let lol_path = if let Some(path) = lol_path {
        PathBuf::from(path)
    } else {
        paths::find_lol_path().map_err(|e| e.to_string())?
    };
    
    let item_sets_path = paths::get_item_sets_path(&lol_path).map_err(|e| e.to_string())?;
    let count_before = count_builds(&item_sets_path).map_err(|e| e.to_string())?;
    
    delete_all_builds(&item_sets_path).map_err(|e| e.to_string())?;
    
    Ok(DeleteResult {
        success: true,
        error: None,
        builds_deleted: count_before,
    })
}

#[tauri::command]
async fn count_existing_builds(lol_path: Option<String>) -> std::result::Result<CountResult, String> {
    log::info!("Counting existing builds");
    
    let lol_path = if let Some(path) = lol_path {
        PathBuf::from(path)
    } else {
        paths::find_lol_path().map_err(|e| e.to_string())?
    };
    
    let item_sets_path = paths::get_item_sets_path(&lol_path).map_err(|e| e.to_string())?;
    let count = count_builds(&item_sets_path).map_err(|e| e.to_string())?;
    
    Ok(CountResult { count })
}

// ============================================================================
// Info Commands
// ============================================================================

#[tauri::command]
async fn get_available_sources() -> std::result::Result<Vec<serde_json::Value>, String> {
    log::info!("Getting available sources");
    let sources = scrapers::sources_info();
    
    let sources_json: Vec<serde_json::Value> = sources
        .iter()
        .map(|s| json!({
            "id": s.id,
            "name": s.name,
        }))
        .collect();
    
    Ok(sources_json)
}

#[tauri::command]
async fn get_version() -> std::result::Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

#[tauri::command]
async fn get_lol_version_from_path(path: String) -> std::result::Result<String, String> {
    log::info!("Getting LoL version from path: {}", path);
    let lol_path = std::path::PathBuf::from(path);
    paths::get_lol_version(&lol_path).map_err(|e| e.to_string())
}

// ============================================================================
// App Entry Point
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();
    
    let builder = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Preferences
            load_preferences,
            save_preferences,
            // Paths
            find_lol_installation,
            get_item_sets_path,
            get_lol_version_from_path,
            // Import
            import_builds,
            // Build management
            delete_builds,
            count_existing_builds,
            // Info
            get_available_sources,
            get_version,
        ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
