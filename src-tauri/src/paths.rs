// Path manager module - detects and validates League of Legends installation
use crate::error::AppError;
use std::path::{Path, PathBuf};
use std::fs;

#[cfg(target_os = "windows")]
fn get_default_lol_paths() -> Vec<PathBuf> {
    vec![
        PathBuf::from("C:\\Riot Games\\League of Legends"),
        PathBuf::from("C:\\Program Files\\Riot Games\\League of Legends"),
        PathBuf::from("C:\\Program Files (x86)\\Riot Games\\League of Legends"),
        PathBuf::from("D:\\Riot Games\\League of Legends"),
        PathBuf::from("E:\\Riot Games\\League of Legends"),
    ]
}

#[cfg(target_os = "macos")]
fn get_default_lol_paths() -> Vec<PathBuf> {
    vec![
        PathBuf::from("/Applications/League of Legends.app"),
        dirs::home_dir()
            .unwrap_or_default()
            .join("Applications/League of Legends.app"),
    ]
}

#[cfg(target_os = "linux")]
fn get_default_lol_paths() -> Vec<PathBuf> {
    vec![
        dirs::home_dir()
            .unwrap_or_default()
            .join(".wine/drive_c/Riot Games/League of Legends"),
        dirs::home_dir()
            .unwrap_or_default()
            .join("Games/league-of-legends"),
    ]
}

/// Find the League of Legends installation path automatically
pub fn find_lol_path() -> Result<PathBuf, AppError> {
    // Try to find via Riot's YAML config first (Windows only)
    #[cfg(target_os = "windows")]
    if let Some(path) = get_path_from_yaml() {
        if is_valid_lol_path(&path) {
            log::info!("Found LoL installation via YAML at: {:?}", path);
            return Ok(path);
        }
    }

    let paths = get_default_lol_paths();
    
    for path in paths {
        if is_valid_lol_path(&path) {
            log::info!("Found LoL installation at: {:?}", path);
            return Ok(path);
        }
    }
    
    Err(AppError::PathNotFound(
        "League of Legends installation not found".to_string()
    ))
}

#[cfg(target_os = "windows")]
fn get_path_from_yaml() -> Option<PathBuf> {
    let yaml_path = PathBuf::from(r"C:\ProgramData\Riot Games\Metadata\league_of_legends.live\league_of_legends.live.product_settings.yaml");
    
    if !yaml_path.exists() {
        return None;
    }

    // Simple parsing to avoid adding dependencies
    if let Ok(content) = fs::read_to_string(&yaml_path) {
        for line in content.lines() {
            let line = line.trim();
            if line.starts_with("product_install_full_path:") {
                if let Some(path_str) = line.splitn(2, ':').nth(1) {
                    let path = path_str.trim().trim_matches('"').trim_matches('\'');
                    // Handle forward slashes and trim trailing slashes
                    // C# code: .Replace('/', '\\').TrimEnd('\\')
                    let path = path.replace("/", "\\");
                    return Some(PathBuf::from(path.trim_end_matches('\\')));
                }
            }
        }
    }
    
    None
}

/// Validate if a path is a valid LoL installation
pub fn is_valid_lol_path(path: &Path) -> bool {
    if !path.exists() {
        return false;
    }
    
    // Check for key files/directories
    #[cfg(target_os = "windows")]
    let config_path = path.join("Config");
    
    #[cfg(target_os = "macos")]
    let config_path = path.join("Contents/LoL/Config");
    
    #[cfg(target_os = "linux")]
    let config_path = path.join("Config");
    
    config_path.exists()
}

/// Get the item sets directory path
pub fn get_item_sets_path(lol_path: &Path) -> Result<PathBuf, AppError> {
    #[cfg(target_os = "windows")]
    let config_path = lol_path.join("Config");
    
    #[cfg(target_os = "macos")]
    let config_path = lol_path.join("Contents/LoL/Config");
    
    #[cfg(target_os = "linux")]
    let config_path = lol_path.join("Config");
    
    if !config_path.exists() {
        return Err(AppError::PathNotFound(
            format!("Config directory not found at {:?}", config_path)
        ));
    }
    
    let item_sets_path = config_path.join("Champions");
    
    // Create Champions directory if it doesn't exist
    if !item_sets_path.exists() {
        fs::create_dir_all(&item_sets_path).map_err(|e| AppError::PathNotFound(format!("Failed to create Champions directory: {}", e)))?;
    }
    
    Ok(item_sets_path)
}

/// Get LoL version from game files
pub fn get_lol_version(lol_path: &Path) -> Result<String, AppError> {
    // Try to read version from system.yaml or other version files
    #[cfg(target_os = "windows")]
    let game_path = lol_path.join("Game");
    
    #[cfg(target_os = "macos")]
    let game_path = lol_path.join("Contents/LoL/Game");
    
    #[cfg(target_os = "linux")]
    let game_path = lol_path.join("Game");
    
    // Look for version files
    if let Ok(entries) = fs::read_dir(&game_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(name) = path.file_name() {
                let name_str = name.to_string_lossy();
                // Version directories typically start with "League of Legends"
                if name_str.starts_with("League of Legends") && path.is_dir() {
                    // Extract version from directory name
                    // e.g., "League of Legends 14.1.1" -> "14.1.1"
                    if let Some(version) = name_str.split_whitespace().last() {
                        return Ok(version.to_string());
                    }
                }
            }
        }
    }
    
    // Fallback: fetch from Riot API
    Ok("latest".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_get_default_paths() {
        let paths = get_default_lol_paths();
        assert!(!paths.is_empty());
    }
}
