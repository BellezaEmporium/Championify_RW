// Error types for the application
use thiserror::Error;
use serde::{Deserialize, Serialize};

#[derive(Error, Debug)]
pub enum ChampionifyError {
    #[error("Network error: {0}")]
    Network(String),
    
    #[error("Parse error: {0}")]
    Parse(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("Path not found: {0}")]
    PathNotFound(String),
    
    #[error("Invalid configuration: {0}")]
    Config(String),
    
    #[error("Scraper error: {0}")]
    Scraper(String),
    
    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<reqwest::Error> for ChampionifyError {
    fn from(err: reqwest::Error) -> Self {
        ChampionifyError::Network(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, ChampionifyError>;

/// Error response for frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

impl From<ChampionifyError> for ErrorResponse {
    fn from(err: ChampionifyError) -> Self {
        let (code, message) = match &err {
            ChampionifyError::Network(msg) => ("NETWORK_ERROR", msg.clone()),
            ChampionifyError::Parse(msg) => ("PARSE_ERROR", msg.clone()),
            ChampionifyError::Io(err) => ("IO_ERROR", err.to_string()),
            ChampionifyError::Json(err) => ("JSON_ERROR", err.to_string()),
            ChampionifyError::PathNotFound(msg) => ("PATH_NOT_FOUND", msg.clone()),
            ChampionifyError::Config(msg) => ("CONFIG_ERROR", msg.clone()),
            ChampionifyError::Scraper(msg) => ("SCRAPER_ERROR", msg.clone()),
            ChampionifyError::Unknown(msg) => ("UNKNOWN_ERROR", msg.clone()),
        };
        
        ErrorResponse {
            code: code.to_string(),
            message,
            details: None,
        }
    }
}
