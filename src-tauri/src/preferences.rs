// Preferences module - manages user preferences and settings
use crate::error::{ChampionifyError, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// UI-facing preference names (for frontend compatibility)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreferencesUI {
    pub locale: String,
    pub install_path: Option<String>,
    pub sr_source: Vec<String>,
    pub aram: bool,
    pub splititems: bool,
    pub skillsformat: bool,
    pub consumables: bool,
    pub consumables_position: String, // "beginning" or "end"
    pub trinkets: bool,
    pub trinkets_position: String, // "beginning" or "end"
    pub locksr: bool,
    pub dontdeleteold: bool,
}

impl Default for PreferencesUI {
    fn default() -> Self {
        Self {
            locale: "en".to_string(),
            install_path: None,
            sr_source: vec!["probuilds".to_string(), "ugg".to_string()],
            aram: false,
            splititems: false,
            skillsformat: false,
            consumables: true,
            consumables_position: "beginning".to_string(),
            trinkets: true,
            trinkets_position: "beginning".to_string(),
            locksr: false,
            dontdeleteold: false,
        }
    }
}

/// Backend-facing preference structure (internal)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Preferences {
    #[serde(default)]
    pub locale: String,
    
    #[serde(default)]
    pub install_path: Option<String>,
    
    #[serde(default = "default_sources")]
    pub selected_sources: Vec<String>,
    
    #[serde(default)]
    pub auto_import: bool,
    
    #[serde(default)]
    pub consumables_position: String,
    
    #[serde(default)]
    pub consumables_skill_order: bool,
    
    #[serde(default)]
    pub trinkets: bool,
    
    #[serde(default)]
    pub lock_item_sets: bool,
    
    #[serde(default)]
    pub split_builds: bool,
    
    #[serde(default)]
    pub sort_by_role: bool,
    
    #[serde(default)]
    pub skill_priorities: bool,
}

fn default_sources() -> Vec<String> {
    vec![
        "probuilds".to_string(),
        "ugg".to_string(),
        "opgg".to_string(),
    ]
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            locale: "en".to_string(),
            install_path: None,
            selected_sources: default_sources(),
            auto_import: false,
            consumables_position: "beginning".to_string(),
            consumables_skill_order: true,
            trinkets: true,
            lock_item_sets: false,
            split_builds: false,
            sort_by_role: true,
            skill_priorities: true,
        }
    }
}

// Conversion between UI and internal format
impl From<PreferencesUI> for Preferences {
    fn from(ui: PreferencesUI) -> Self {
        Self {
            locale: ui.locale,
            install_path: ui.install_path,
            selected_sources: ui.sr_source,
            auto_import: false,
            consumables_position: ui.consumables_position,
            consumables_skill_order: ui.skillsformat,
            trinkets: ui.trinkets,
            lock_item_sets: ui.locksr,
            split_builds: ui.splititems,
            sort_by_role: true,
            skill_priorities: ui.skillsformat,
        }
    }
}

impl From<Preferences> for PreferencesUI {
    fn from(prefs: Preferences) -> Self {
        Self {
            locale: prefs.locale,
            install_path: prefs.install_path,
            sr_source: prefs.selected_sources,
            aram: false,
            splititems: prefs.split_builds,
            skillsformat: prefs.skill_priorities,
            consumables: true,
            consumables_position: prefs.consumables_position,
            trinkets: prefs.trinkets,
            trinkets_position: "beginning".to_string(),
            locksr: prefs.lock_item_sets,
            dontdeleteold: false,
        }
    }
}

impl Preferences {
    /// Get the preferences file path
    fn get_prefs_path() -> Result<PathBuf> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| ChampionifyError::Config("Could not find config directory".to_string()))?;
        
        let app_dir = config_dir.join("championify");
        
        // Create directory if it doesn't exist
        if !app_dir.exists() {
            fs::create_dir_all(&app_dir)?;
        }
        
        Ok(app_dir.join("prefs.json"))
    }
    
    /// Load preferences from disk
    pub fn load() -> Result<Self> {
        let path = Self::get_prefs_path()?;
        
        if !path.exists() {
            log::info!("Preferences file not found, using defaults");
            return Ok(Self::default());
        }
        
        let content = fs::read_to_string(&path)?;
        let prefs: Preferences = serde_json::from_str(&content)?;
        
        log::info!("Loaded preferences from {:?}", path);
        Ok(prefs)
    }
    
    /// Save preferences to disk
    pub fn save(&self) -> Result<()> {
        let path = Self::get_prefs_path()?;
        let json = serde_json::to_string_pretty(self)?;
        
        fs::write(&path, json)?;
        log::info!("Saved preferences to {:?}", path);
        
        Ok(())
    }
    
    /// Load as UI format (for frontend)
    pub fn load_ui() -> Result<PreferencesUI> {
        Ok(Self::load()?.into())
    }
    
    /// Save from UI format (from frontend)
    pub fn save_ui(ui_prefs: PreferencesUI) -> Result<()> {
        let prefs: Preferences = ui_prefs.into();
        prefs.save()
    }
    
    /// Update a specific preference field
    #[allow(dead_code)]
    pub fn update_field(&mut self, field: &str, value: serde_json::Value) -> Result<()> {
        match field {
            "locale" => {
                if let Some(s) = value.as_str() {
                    self.locale = s.to_string();
                }
            }
            "install_path" => {
                self.install_path = value.as_str().map(|s| s.to_string());
            }
            "selected_sources" => {
                if let Some(arr) = value.as_array() {
                    self.selected_sources = arr
                        .iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect();
                }
            }
            "auto_import" => {
                if let Some(b) = value.as_bool() {
                    self.auto_import = b;
                }
            }
            "consumables_position" => {
                if let Some(s) = value.as_str() {
                    self.consumables_position = s.to_string();
                }
            }
            "consumables_skill_order" => {
                if let Some(b) = value.as_bool() {
                    self.consumables_skill_order = b;
                }
            }
            "trinkets" => {
                if let Some(b) = value.as_bool() {
                    self.trinkets = b;
                }
            }
            "lock_item_sets" => {
                if let Some(b) = value.as_bool() {
                    self.lock_item_sets = b;
                }
            }
            "split_builds" => {
                if let Some(b) = value.as_bool() {
                    self.split_builds = b;
                }
            }
            "sort_by_role" => {
                if let Some(b) = value.as_bool() {
                    self.sort_by_role = b;
                }
            }
            "skill_priorities" => {
                if let Some(b) = value.as_bool() {
                    self.skill_priorities = b;
                }
            }
            _ => {
                return Err(ChampionifyError::Config(format!("Unknown preference field: {}", field)));
            }
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_preferences() {
        let prefs = Preferences::default();
        assert_eq!(prefs.locale, "en");
        assert!(!prefs.selected_sources.is_empty());
    }
    
    #[test]
    fn test_serialization() {
        let prefs = Preferences::default();
        let json = serde_json::to_string(&prefs).unwrap();
        let deserialized: Preferences = serde_json::from_str(&json).unwrap();
        assert_eq!(prefs.locale, deserialized.locale);
    }
}
