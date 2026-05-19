use once_cell::sync::Lazy;
use reqwest::Client;
use std::collections::HashMap;
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
    pub game_type: GameType,
}

#[async_trait]
pub trait BuildScraper: Send + Sync {
    // Identify the scraper
    fn source_info(&self) -> SourceInfo;
    // Get the source version (often different from Riot's official naming)
    async fn get_version(&self, client: &Client) -> Result<String, AppError>;
    // Obtain Summoner's Rift builds, optionally filtered by role
    async fn get_sr(&self, client: &Client, context: &ScraperContext, role: Option<&str>) -> Result<Vec<BuildResult>, AppError>;
    // optional ARAM method
    async fn get_aram(&self, _client: &Client, _context: &ScraperContext) -> Result<Vec<BuildResult>, AppError> {
        Ok(vec![]) // default implementation returns empty
    }
    // Check if the server responds correctly (or not)
    async fn check_health(&self, _client: &Client) -> ScraperHealth {
        ScraperHealth::Unknown
    }
    // Indicate if the scraper needs to get League's current patch version from Riot's API before fetching builds
    async fn needs_riot_version(&self) -> bool {
        false
    }
}

// Source registry
pub static SOURCES: Lazy<HashMap<&'static str, Box<dyn BuildScraper>>> = Lazy::new(|| {
    let mut m: HashMap<&'static str, Box<dyn BuildScraper>> = HashMap::new();
    m.insert("ugg", Box::new(ugg::UggScraper) as Box<dyn BuildScraper>);
    m.insert("opgg", Box::new(opgg::OpggScraper) as Box<dyn BuildScraper>);
    m.insert("koreanbuilds", Box::new(koreanbuilds::KoreanBuildsScraper) as Box<dyn BuildScraper>);
    m.insert("probuilds", Box::new(probuilds::ProBuildsScraper) as Box<dyn BuildScraper>);
    // Work in progress for these:
    //m.insert("trackergg", Box::new(trackergg::TrackerGGScraper) as Box<dyn BuildScraper>);
    m
});

pub fn sources_info() -> Vec<SourceInfo> {
    let mut sources: Vec<_> = SOURCES.values().map(|s| s.source_info()).collect();
    sources.sort_by(|a, b| a.name.cmp(&b.name));
    sources
}
