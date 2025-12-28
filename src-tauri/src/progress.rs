// Progress module - tracks and emits progress events to the frontend
// TODO: Integrate with frontend progress bar
#![allow(dead_code)]
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    pub stage: String,
    pub champion: Option<String>,
    pub source: Option<String>,
    pub current: u32,
    pub total: u32,
    pub percentage: f32,
    pub message: String,
}

impl ProgressEvent {
    pub fn new(stage: &str, current: u32, total: u32, message: &str) -> Self {
        let percentage = if total > 0 {
            (current as f32 / total as f32) * 100.0
        } else {
            0.0
        };
        
        Self {
            stage: stage.to_string(),
            champion: None,
            source: None,
            current,
            total,
            percentage,
            message: message.to_string(),
        }
    }
    
    pub fn with_champion(mut self, champion: &str) -> Self {
        self.champion = Some(champion.to_string());
        self
    }
    
    pub fn with_source(mut self, source: &str) -> Self {
        self.source = Some(source.to_string());
        self
    }
}

/// Progress tracker for import operations
pub struct ProgressTracker {
    app: AppHandle,
    current_stage: String,
}

impl ProgressTracker {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            current_stage: String::new(),
        }
    }
    
    /// Emit a progress event
    pub fn emit(&self, event: ProgressEvent) {
        if let Err(e) = self.app.emit("progress", event.clone()) {
            log::error!("Failed to emit progress event: {}", e);
        } else {
            log::debug!("Progress: {} - {}", event.stage, event.message);
        }
    }
    
    /// Start a new stage
    pub fn start_stage(&mut self, stage: &str, message: &str) {
        self.current_stage = stage.to_string();
        let event = ProgressEvent::new(stage, 0, 0, message);
        self.emit(event);
    }
    
    /// Update progress within current stage
    pub fn update(&self, current: u32, total: u32, message: &str) {
        let event = ProgressEvent::new(&self.current_stage, current, total, message);
        self.emit(event);
    }
    
    /// Update with champion context
    pub fn update_champion(&self, current: u32, total: u32, champion: &str, message: &str) {
        let event = ProgressEvent::new(&self.current_stage, current, total, message)
            .with_champion(champion);
        self.emit(event);
    }
    
    /// Update with source context
    pub fn update_source(&self, current: u32, total: u32, source: &str, message: &str) {
        let event = ProgressEvent::new(&self.current_stage, current, total, message)
            .with_source(source);
        self.emit(event);
    }
    
    /// Complete the current stage
    pub fn complete(&self, message: &str) {
        let event = ProgressEvent::new(&self.current_stage, 100, 100, message);
        self.emit(event);
    }
    
    /// Report an error
    pub fn error(&self, message: &str) {
        let event = ProgressEvent {
            stage: "error".to_string(),
            champion: None,
            source: None,
            current: 0,
            total: 0,
            percentage: 0.0,
            message: message.to_string(),
        };
        self.emit(event);
    }
}
