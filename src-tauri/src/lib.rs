mod error;
mod item_sets;
mod paths;
mod preferences;
mod progress;
mod riot_cdn;
mod scrapers;

use crate::scrapers::{SOURCES, ScraperContext};
use crate::scrapers::types::GameType;
use error::AppError;
use item_sets::{build_to_item_set, count_builds, delete_all_builds, write_item_set};
use riot_cdn::{get_riot_champions, get_riot_items, get_riot_version};
use scrapers::registry;

use futures::{future::join_all};
use futures::stream::{self, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use sys_locale;
use tauri::{AppHandle, Emitter};

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

pub struct AppState {
    pub http_client: reqwest::Client,
    pub is_importing: Mutex<bool>,
}

/// Generic response wrapper for all backend operations
/// TODO: Use this for standardized API responses
#[allow(dead_code)]
#[derive(Debug, Serialize)]
struct ApiResponse<T: Serialize> {
    success: bool,
    data: Option<T>,
    error: Option<AppError>,
}

// ============================================================================
// Preferences Commands
// ============================================================================

#[tauri::command]
async fn load_preferences() -> std::result::Result<preferences::PreferencesUI, AppError> {
    log::info!("Loading preferences for UI");
    let prefs = preferences::Preferences::load_ui()?;
    Ok(prefs)
}

#[tauri::command]
async fn save_preferences(
    preferences: preferences::PreferencesUI,
) -> std::result::Result<(), AppError> {
    log::info!("Saving preferences from UI");
    preferences::Preferences::save_ui(preferences)?;
    Ok(())
}

#[tauri::command]
async fn get_os_locale() -> std::result::Result<String, AppError> {
    Ok(sys_locale::get_locale().unwrap_or_else(|| "en".to_string()))
}

// ============================================================================
// Path Detection Commands
// ============================================================================

#[tauri::command]
async fn find_lol_installation() -> std::result::Result<String, AppError> {
    log::info!("Finding LoL installation");
    let path = paths::find_lol_path()?;
    Ok(path.to_string_lossy().to_string())
}

pub fn resolve_lol_path(provided_path: Option<String>) -> Result<PathBuf, AppError> {
    if let Some(path) = provided_path {
        let path_buf = PathBuf::from(path);
        if paths::is_valid_lol_path(&path_buf) {
            log::info!("Using provided LoL path: {:?}", path_buf);
            return Ok(path_buf);
        } else {
            log::warn!(
                "Provided path is not a valid LoL installation: {:?}",
                path_buf
            );
        }
    }

    paths::find_lol_path()
}

#[tauri::command]
async fn get_item_sets_path(lol_path: Option<String>) -> std::result::Result<String, AppError> {
    log::info!("Getting item sets path");

    let lol_path = resolve_lol_path(lol_path)?;

    let item_sets_path = paths::get_item_sets_path(&lol_path)?;
    Ok(item_sets_path.to_string_lossy().to_string())
}

// ============================================================================
// Import/Scraping Commands
// ============================================================================

#[tauri::command]
async fn import_builds(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    payload: ImportPayload,
) -> std::result::Result<ImportResult, AppError> {
    log::info!("Starting build import from sources: {:?}", payload.sources);

    struct ImportInProgressGuard<'a> {
        flag: &'a Mutex<bool>,
    }
    impl Drop for ImportInProgressGuard<'_> {
        fn drop(&mut self) {
            match self.flag.lock() {
                Ok(mut guard) => *guard = false,
                Err(poisoned) => {
                    *poisoned.into_inner() = false; // recover from poison
                }
            }
        }
    }

    {
        let mut is_importing = state.is_importing.lock()
        .map_err(|_| AppError::Custom("Import lock poisoned".to_string()))?;
        if *is_importing {
            return Err(AppError::Custom("Import already in progress".to_string()));
        }
        *is_importing = true;
    }
    let _import_guard = ImportInProgressGuard {
        flag: &state.is_importing,
    };

    // Get LoL path
    let lol_path = resolve_lol_path(payload.path)?;

    let item_sets_path = paths::get_item_sets_path(&lol_path)?;

    // Create HTTP client

    let riot_version = match get_riot_version(&state.http_client).await {
        Ok(version) => version,
        Err(err) => {
            log::warn!("Failed to resolve Riot patch version: {}", err);
            "latest".to_string()
        }
    };

    let game_type = if payload.options.get("aram").and_then(|v| v.as_bool()).unwrap_or(false) {
        GameType::Aram
    } else {
        GameType::SummonersRift
    };

    let futures = payload.sources.iter().map(|source_id| {
        let client = &state.http_client;
        let riot_version = riot_version.clone();
        let app = app.clone();
        let item_sets_path = item_sets_path.clone();
        let game_type = game_type.clone();

        async move {
            log::info!("Processing source: {}", source_id);

            let _ = app.emit(
                "import-progress",
                json!({
                    "source": source_id,
                    "status": "fetching"
                }),
            );

            let builds = match SOURCES.get(source_id.as_str()) {
                Some(scraper) => {
                    let context = ScraperContext {
                        riot_version: riot_version.clone(),
                        game_type: game_type.clone(),
                    };
                    if matches!(game_type, GameType::Aram) {
                        scraper.get_aram(client, &context).await?
                    } else {
                        scraper.get_sr(client, &context, None).await?
                    }
                }
                None => return Err(AppError::Custom(format!("Unknown source: {}", source_id))),
            };

            let write_futures = builds.into_iter().enumerate().map(|(index, build_result)| {
                let item_sets_path = item_sets_path.clone();

                let build = scrapers::types::Build {
                    champion: build_result.champ.clone(),
                    role: build_result.file_prefix.clone(),
                    title: build_result.riot_json.title.clone(),
                    items: build_result.riot_json.blocks.clone(),
                    skills: None,
                };

                async move {
                    write_item_set(
                        &item_sets_path,
                        &build.champion,
                        index,
                        &build_to_item_set(&build),
                    )
                    .await
                }
            });

            let write_results: Vec<_> = stream::iter(write_futures)
            .buffer_unordered(10)
            .collect()
            .await;

            let mut count = 0;
            for res in write_results {
                res?;
                count += 1;
            }

            let _ = app.emit(
                "import-progress",
                json!({
                    "source": source_id,
                    "status": "complete",
                    "count": count
                }),
            );

            Ok::<usize, AppError>(count)
        }
    });
    let results = join_all(futures).await;

    let total_builds: usize = results.into_iter().sum::<Result<usize, AppError>>()?;

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
async fn delete_builds(lol_path: Option<String>) -> std::result::Result<DeleteResult, AppError> {
    log::info!("Deleting all builds");

    let lol_path = resolve_lol_path(lol_path)?;

    let item_sets_path = paths::get_item_sets_path(&lol_path)?;
    let count_before = count_builds(&item_sets_path).await?;

    delete_all_builds(&item_sets_path).await?;

    Ok(DeleteResult {
        success: true,
        error: None,
        builds_deleted: count_before,
    })
}

#[tauri::command]
async fn count_existing_builds(
    lol_path: Option<String>,
) -> std::result::Result<CountResult, AppError> {
    log::info!("Counting existing builds");

    let lol_path = resolve_lol_path(lol_path)?;

    let item_sets_path = paths::get_item_sets_path(&lol_path)?;
    let count = count_builds(&item_sets_path).await?;

    Ok(CountResult { count })
}

// ============================================================================
// Info Commands
// ============================================================================

#[tauri::command]
async fn get_available_sources() -> std::result::Result<Vec<scrapers::SourceInfo>, AppError> {
    log::info!("Getting available sources");
    Ok(scrapers::sources_info())
}

#[tauri::command]
async fn get_version() -> std::result::Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

/// Get health snapshot for all scrapers
#[tauri::command]
async fn get_scraper_statuses(
    state: tauri::State<'_, AppState>,
) -> std::result::Result<Vec<registry::ScraperStatus>, AppError> {
    log::info!("Collecting scraper statuses");

    Ok(registry::collect_statuses(&state.http_client).await)
}

/// Get LoL patch version
#[tauri::command]
async fn get_lol_version(
    state: tauri::State<'_, AppState>,
) -> std::result::Result<String, AppError> {
    log::info!("Getting Riot patch version");

    get_riot_version(&state.http_client)
        .await
        .map_err(|e| AppError::Custom(e.to_string()))
}

// ============================================================================
// App Entry Point
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .pool_idle_timeout(std::time::Duration::from_secs(90))
        .build()
        .expect("Failed to build HTTP client");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            http_client,
            is_importing: Mutex::new(false),
        })
        .invoke_handler(tauri::generate_handler![
            load_preferences,
            save_preferences,
            get_os_locale,
            find_lol_installation,
            get_item_sets_path,
            get_lol_version,
            import_builds,
            delete_builds,
            count_existing_builds,
            get_available_sources,
            get_version,
            get_scraper_statuses,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
