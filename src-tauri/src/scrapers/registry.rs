use crate::scrapers::{SOURCES, sources_info};
use crate::scrapers::types::SourceInfo;
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use futures::future::join_all;

fn is_unavailable_marker(value: &str) -> bool {
    let lowered = value.trim().to_lowercase();
    lowered.contains("unavailable") || lowered.contains("indisponible")
}


/// High-level health indicator for a scraper/source.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ScraperHealth {
    Available,
    Down,
    Unknown,
}

/// Normalized status record for a scraper.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperStatus {
    pub id: String,
    pub name: String,
    pub status: ScraperHealth,
    pub latency_ms: Option<u128>,
    pub last_check: DateTime<Utc>,
    pub error_message: Option<String>,
    pub confidence_score: Option<f32>,
    pub retrieved_value: Option<String>,
}

/// Collect status across all registered scrapers.
pub async fn collect_statuses(client: &Client) -> Vec<ScraperStatus> {
    // futures usage here
    let checks = sources_info().into_iter().map(|info| {
        async move {
            check_single(client, &info).await
        }
    });
    join_all(checks).await
}

async fn check_single(client: &Client, info: &SourceInfo) -> ScraperStatus {
    let now = Utc::now();

    let (status, error_message, retrieved_value, latency_ms) = match SOURCES.get(info.id.as_str()) {
    Some(scraper) => {
        let started = Instant::now();
        
        // On récupère la version (qui agit aussi comme un test de connectivité)
        let version = scraper.get_version(client).await;
        
                let version_value = version.ok().map(|v| v.to_string());
        let status = match &version_value {
            Some(value) if is_unavailable_marker(value) => ScraperHealth::Down,
            Some(_) => ScraperHealth::Available,
            None => ScraperHealth::Down,
        };

        let latency = if status == ScraperHealth::Available {
            Some(started.elapsed().as_millis())
        } else {
            None
        };

        let error_message = if status == ScraperHealth::Down {
            version_value
                .as_ref()
                .filter(|value| is_unavailable_marker(value))
                .map(|_| "Source reported unavailable".to_string())
        } else {
            None
        };
        
        (status, error_message, version_value, latency)    
    },
        None => (ScraperHealth::Unknown, Some("Scraper not found".to_string()), None, None),
    };

    ScraperStatus {
        id: info.id.clone(),
        name: info.name.clone(),
        status,
        latency_ms,
        last_check: now,
        error_message,
        confidence_score: None,
        retrieved_value,
    }
}