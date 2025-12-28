// Placeholder implementation for Tracker.gg
// API endpoints:
// - https://api.tracker.gg/api/v1/lol/champions/{championId}/build?region=EUW&role={position}
// - https://api.tracker.gg/api/v1/lol/champions?region=EUW
//
// WARNING: This scraper is NOT yet implemented. 
// Do NOT expose this source in the frontend until implementation is complete.
// See src/sources.js - trackergg is currently commented out.

use reqwest::Client;
use anyhow::Result;

use crate::scrapers::types;

pub fn source_info() -> types::SourceInfo {
    types::SourceInfo {
        name: "Tracker.gg".to_string(),
        id: "trackergg".to_string(),
    }
}

/// TODO: Implement full functionality for Tracker.gg scraper
/// 
/// When implementing:
/// 1. Add trackergg.png to src/img/sources/
/// 2. Uncomment trackergg in src/sources.js
/// 3. Test the scraper thoroughly before enabling
pub async fn get_sr(_client: &Client) -> Result<Vec<types::BuildResult>> {
    // Return empty vector instead of panicking to prevent crashes
    // if this source is somehow selected
    log::warn!("Tracker.gg scraper is not yet implemented - returning empty results");
    Ok(vec![])
}
