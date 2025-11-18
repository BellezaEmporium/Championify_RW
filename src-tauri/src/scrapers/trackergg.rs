// Placeholder implementation for Tracker.gg
// API endpoints:
// - https://api.tracker.gg/api/v1/lol/champions/{championId}/build?region=EUW&role={position}
// - https://api.tracker.gg/api/v1/lol/champions?region=EUW

use reqwest::Client;
use anyhow::Result;

use crate::scrapers::types;

pub fn source_info() -> types::SourceInfo {
    types::SourceInfo {
        name: "Tracker.gg".to_string(),
        id: "trackergg".to_string(),
    }
}

// TODO: Implement full functionality
pub async fn get_sr(client: &Client) -> Result<Vec<types::BuildResult>> {
    unimplemented!("Tracker.gg implementation pending")
}
