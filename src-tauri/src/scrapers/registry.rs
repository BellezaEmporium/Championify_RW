use crate::scrapers::{opgg, sources_info, ugg};
use crate::scrapers::types::SourceInfo;
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// High-level health indicator for a scraper/source.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScraperHealth {
    Unknown,
    Available,
    Down,
}

/// Normalized status record for a scraper.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperStatus {
    pub source: String,
    pub status: ScraperHealth,
    pub latency_ms: Option<u128>,
    pub last_check: DateTime<Utc>,
    pub error_message: Option<String>,
    pub confidence_score: Option<f32>,
    pub retrieved_value: Option<String>,
}

/// Collect status across all registered scrapers.
pub async fn collect_statuses(client: &Client) -> Vec<ScraperStatus> {
    let mut statuses = Vec::new();

    for info in sources_info() {
        statuses.push(check_single(client, &info).await);
    }

    statuses
}

async fn check_single(client: &Client, info: &SourceInfo) -> ScraperStatus {
    let started = Instant::now();
    let now = Utc::now();

    // Default values
    let mut status = ScraperHealth::Unknown;
    let mut error_message = None;
    let mut retrieved_value = None;
    let mut latency_ms = None;

    match info.id.as_str() {
        // OP.GG exposes a lightweight versions endpoint; use it as health + value.
        "opgg" => match opgg::get_version(client).await {
            Ok(version) => {
                status = ScraperHealth::Available;
                retrieved_value = Some(version);
                latency_ms = Some(started.elapsed().as_millis());
            }
            Err(err) => {
                status = ScraperHealth::Down;
                error_message = Some(err.to_string());
            }
        },

        // u.gg needs the Riot version key; use the metadata endpoint directly to infer availability.
        "ugg" => match ugg::get_version(client, "latest").await {
            Ok(version) => {
                status = ScraperHealth::Available;
                retrieved_value = Some(version);
                latency_ms = Some(started.elapsed().as_millis());
            }
            Err(err) => {
                status = ScraperHealth::Down;
                error_message = Some(err.to_string());
            }
        },

        // Koreanbuilds/Probuilds currently lack a dedicated health endpoint.
        "koreanbuilds" | "probuilds" => {
            status = ScraperHealth::Unknown;
            error_message = Some("Health check not implemented yet".to_string());
        }

        // Tracker.gg is intentionally not implemented.
        "trackergg" => {
            status = ScraperHealth::Unknown;
            error_message = Some("Scraper not implemented".to_string());
        }

        // Future scrapers fall back to unknown.
        _ => {
            status = ScraperHealth::Unknown;
            error_message = Some("Unknown source".to_string());
        }
    }

    ScraperStatus {
        source: info.name.clone(),
        status,
        latency_ms,
        last_check: now,
        error_message,
        confidence_score: None,
        retrieved_value,
    }
}
