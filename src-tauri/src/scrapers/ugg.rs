use async_trait::async_trait;
use reqwest::Client;
use serde_json::Value;
use serde::Deserialize;
use std::collections::HashMap;

use crate::riot_cdn::get_riot_version;
use crate::scrapers::{BuildScraper, ScraperContext};
use crate::AppError;
use crate::scrapers::types::{SourceInfo, ItemBlock, RiotJsonSR, BuildResult};
use crate::get_riot_champions;
use crate::scrapers::ScraperHealth;

#[derive(Deserialize, Debug)]
struct UggBuildItem {
    position: Option<String>,
    blocks: Vec<ItemBlock>,
}

type UggResponse = HashMap<String, HashMap<String, Vec<UggBuildItem>>>;

const UGG_VERSION_URL: &str = "https://static.bigbrain.gg/assets/lol/riot_patch_update/prod/ugg/ugg-api-versions.json";
const UGG_BUILD_MODES: [&str; 8] = [
    "rankings",
    "overview",
    "ad-overview",
    "ap-overview",
    "tank-overview",
    "crit-overview",
    "lethality-overview",
    "onhit-overview",
];

pub fn source_info() -> SourceInfo {
    SourceInfo {
        name: "u.gg".to_string(),
        id: "ugg".to_string(),
    }
}

pub struct UggScraper;

#[async_trait]
impl BuildScraper for UggScraper {
    fn source_info(&self) -> SourceInfo {
        source_info()
    }

    async fn get_version(&self, client: &Client) -> Result<String, AppError> {
        let riot_version = get_riot_version(client).await?;
        let riot_ver_key = riot_version
            .split('.')
            .take(2)
            .collect::<Vec<_>>()
            .join("_");
    
    let response = client
        .get(UGG_VERSION_URL)
        .send()
        .await?
        .error_for_status()?;
    
    let data: HashMap<String, Value> = response.json().await?;
    
    data.get(&riot_ver_key)
        .and_then(|v| v.get("builds"))
        .and_then(|builds| builds.as_str())
        .map(|version_str| version_str.to_string())
        .ok_or_else(|| {
            AppError::Parse(format!(
                "Could not extract version from UGG response for key: {}", 
                riot_ver_key
            ))
        })
    }

    async fn get_sr(
        &self,
        client: &Client,
        context: &ScraperContext,
        _role: Option<&str>,
    ) -> Result<Vec<BuildResult>, AppError> {
        // Basically, UGG has champions from Riot Games DDragon, so no need to fetch anything, just reuse Riot's CDN.
        let ugg_version = self.get_version(client).await?;
        let resolved_riot_version = get_riot_version(client).await?;
        let riot_champions_json = get_riot_champions(client, &resolved_riot_version).await?;
        let champions = riot_champions_json
            .get("data")
            .and_then(|d| d.as_object())
            .ok_or_else(|| AppError::Parse("Invalid UGG champions response".to_string()))?;
    
        let mut all_results = Vec::new();
        
        for (key, champ_data) in champions {
            let champ_id = champ_data
                .get("key")
                .and_then(|k| k.as_str())
                .unwrap_or_default();
            
            println!("Processing UGG: {}", key);
            
            let riot_ver_key = resolved_riot_version
                .split('.')
                .take(2)
                .collect::<Vec<_>>()
                .join("_");
            
            let url = format!(
                "https://stats2.u.gg/lol/{}/{}/{}/{}/{}/{}.json",
                ugg_version.split('.').take(2).collect::<Vec<_>>().join("_"),
                UGG_BUILD_MODES[1],
                riot_ver_key,
                context.game_type.as_str(),
                champ_id,
                ugg_version
            );
            
            match client.get(&url).send().await {
                Ok(response) => {
                    if let Ok(valid_response) = response.error_for_status() {
                        if let Ok(riot_json) = valid_response.json::<UggResponse>().await {
                            let builds = extract_builds(riot_json, None);
                            
                            for (position, blocks) in builds {
                                let file_prefix = position.to_lowercase();
                                let title = format!(
                                    "UGG {} {}{}",
                                    key,
                                    ugg_version,
                                    if position != "All" {
                                        format!(" ({})", position)
                                    } else {
                                        String::new()
                                    }
                                );
                                
                                all_results.push(BuildResult {
                                    champ: key.clone(),
                                    file_prefix,
                                    riot_json: RiotJsonSR {
                                        champion: key.clone(),
                                        title,
                                        blocks,
                                        map: None,
                                    },
                                    source: "ugg".to_string(),
                                });
                            }
                        }
                    } else {
                        log::warn!("Failed to parse JSON into UggResponse for champ {}", key);
                    }
                }
                Err(e) => log::error!("Error fetching builds for {}: {}", key, e),
            }
        }
        Ok(all_results)
    }
    async fn check_health(&self, client: &Client) -> ScraperHealth {
        let url = "https://lol-api-champion.op.gg/api/meta/versions";
        
        match client.get(url).send().await {
            Ok(resp) if resp.status().is_success() => ScraperHealth::Available,
            _ => ScraperHealth::Down,
        }
    }
}

fn extract_builds(data: UggResponse, role: Option<&str>) -> Vec<(String, Vec<ItemBlock>)> {
    let mut builds = Vec::new();
    
    for (_, layer_obj) in data {
        for (_, arr) in layer_obj {
            for build in arr {
                let position = build.position.unwrap_or_else(|| "All".to_string());
                if role.is_none() || role == Some(position.as_str()) {
                    builds.push((position, build.blocks));
                }
            }
        }
    }
    
    builds
}