use once_cell::sync::Lazy;
use std::collections::HashMap;
use reqwest::Client;
use async_trait::async_trait;
use crate::{error::AppError, scrapers::registry::ScraperHealth};

pub mod types;
pub use types::*;

pub mod ugg;
pub mod opgg;
pub mod probuilds;
pub mod koreanbuilds;
pub mod trackergg;
pub mod registry;

pub struct ScraperContext {
    pub riot_version: String,
    pub game_type: String, // ex: "ranked_solo_5x5" ou "aram"
}

#[async_trait]
pub trait BuildScraper: Send + Sync {
    fn source_info(&self) -> SourceInfo;
    async fn get_version(&self, client: &Client) -> Result<String, AppError>;
    async fn get_sr(&self, client: &Client, context: &ScraperContext, role: Option<&str>) -> Result<Vec<BuildResult>, AppError>;
    // optional ARAM method
    async fn get_aram(&self, _client: &Client, _context: &ScraperContext) -> Result<Vec<BuildResult>, AppError> {
        Ok(vec![]) // default implementation returns empty
    }
    async fn check_health(&self, _client: &Client) -> ScraperHealth {
        ScraperHealth::Unknown
    }
}

// Source registry
pub static SOURCES: Lazy<HashMap<&'static str, Box<dyn BuildScraper>>> = Lazy::new(|| {
    let mut m: HashMap<&'static str, Box<dyn BuildScraper>> = HashMap::new();
    m.insert("ugg", Box::new(ugg::UggScraper));
    m.insert("opgg", Box::new(opgg::OpggScraper));
    // Work in progress for these:
    //m.insert("probuilds", Box::new(probuilds::ProbuildsScraper));
    //m.insert("koreanbuilds", Box::new(koreanbuilds::KoreanbuildsScraper));
    //m.insert("trackergg", Box::new(trackergg::TrackerggScraper));
    m
});

pub fn sources_info() -> Vec<SourceInfo> {
    let mut sources: Vec<_> = SOURCES.values().map(|s| s.source_info()).collect();
    sources.sort_by(|a, b| a.name.cmp(&b.name));
    sources
}
