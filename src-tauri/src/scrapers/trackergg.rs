// Placeholder implementation for Tracker.gg
// API endpoints:
// - https://api.tracker.gg/api/v1/lol/champions/{championId}/build?region=EUW&role={position}
// - https://api.tracker.gg/api/v1/lol/champions?region=EUW
//
// WARNING: This scraper is NOT yet implemented. 
// Do NOT expose this source in the frontend until implementation is complete.
// See mod.rs - trackergg is currently commented out.

use reqwest::Client;
use async_trait::async_trait;

use crate::{error::AppError, scrapers::{BuildScraper, registry::ScraperHealth, types}};

/// TODO: Implement full functionality for Tracker.gg scraper
/// 
/// When implementing:
/// 1. Add trackergg.png to src/img/sources/
/// 2. Uncomment trackergg in mod.rs
/// 3. Test the scraper thoroughly before enabling

pub struct TrackerGGScraper;

#[async_trait]
impl BuildScraper for TrackerGGScraper {
    fn source_info(&self) -> types::SourceInfo {
        types::SourceInfo {
            name: "Tracker.gg".to_string(),
            id: "trackergg".to_string(),
        }
    }

    async fn get_version(&self, _client: &Client) -> Result<String, AppError> {
        Err(AppError::Custom("Tracker.gg scraper not yet implemented".to_string()))
    }

    async fn get_sr(&self, _client: &Client, _context: &crate::scrapers::ScraperContext, _role: Option<&str>) -> Result<Vec<types::BuildResult>, AppError> {
        Err(AppError::Custom("Tracker.gg scraper not yet implemented".to_string()))
    }

    async fn get_aram(&self, _client: &Client, _context: &crate::scrapers::ScraperContext) -> Result<Vec<types::BuildResult>, AppError> {
        Err(AppError::Custom("Tracker.gg scraper not yet implemented".to_string()))
    }

    async fn check_health(&self, _client: &Client) -> ScraperHealth {
        ScraperHealth::Unknown
    }

    async fn needs_riot_version(&self) -> bool {
        false
    }
}