use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use anyhow::{Result, Context};

// ONLY import types, don't define them
use crate::scrapers::types::{SourceInfo, ItemBlock, Item, RiotJsonSR, BuildResult};

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

// NO struct definitions here, just functions

pub fn source_info() -> SourceInfo {
    SourceInfo {
        name: "u.gg".to_string(),
        id: "ugg".to_string(),
    }
}

pub async fn get_version(client: &Client, riot_version: &str) -> Result<String> {
    let riot_ver_key = riot_version
        .split('.')
        .take(2)
        .collect::<Vec<_>>()
        .join("_");
    
    let response = client
        .get(UGG_VERSION_URL)
        .send()
        .await
        .context("Failed to fetch UGG version")?;
    
    let data: HashMap<String, Value> = response
        .json()
        .await
        .context("Failed to parse UGG version JSON")?;
    
    if let Some(builds) = data.get(&riot_ver_key).and_then(|v| v.get("builds")) {
        if let Some(version_str) = builds.as_str() {
            return Ok(version_str.to_string());
        }
    }
    
    eprintln!("Could not extract version from UGG response, using fallback");
    Ok("1.5.0".to_string())
}

fn extract_builds_from_ugg(riot_json: &Value, role: Option<&str>) -> Vec<(String, Vec<ItemBlock>)> {
    let mut builds = Vec::new();
    
    if let Some(obj) = riot_json.as_object() {
        for layer in obj.values() {
            if let Some(layer_obj) = layer.as_object() {
                for sub in layer_obj.values() {
                    if let Some(arr) = sub.as_array() {
                        for build in arr {
                            if let Some(blocks) = build.get("blocks") {
                                let position = build
                                    .get("position")
                                    .and_then(|p| p.as_str())
                                    .unwrap_or("All");
                                
                                if role.is_none() || role == Some(position) {
                                    if let Ok(parsed_blocks) = serde_json::from_value(blocks.clone()) {
                                        builds.push((position.to_string(), parsed_blocks));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    builds
}

pub async fn get_sr(
    client: &Client,
    riot_version: &str,
    game_type: &str,
) -> Result<Vec<BuildResult>> {
    let ugg_version = get_version(client, riot_version).await?;
    
    let overview_url = format!(
        "https://static.bigbrain.gg/assets/lol/riot_static/{}/data/en_US/champion.json",
        riot_version
    );
    
    let response = client.get(&overview_url).send().await?;
    let data: Value = response.json().await?;
    
    let champions = data
        .get("data")
        .and_then(|d| d.as_object())
        .context("Invalid UGG champions response")?;
    
    let mut all_results = Vec::new();
    
    for (key, champ_data) in champions {
        let champ_id = champ_data
            .get("key")
            .and_then(|k| k.as_str())
            .unwrap_or_default();
        
        println!("Processing UGG: {}", key);
        
        let riot_ver_key = riot_version
            .split('.')
            .take(2)
            .collect::<Vec<_>>()
            .join("_");
        
        let url = format!(
            "https://stats2.u.gg/lol/1.5/{}/{}/{}/{}/{}.json",
            UGG_BUILD_MODES[1], riot_ver_key, game_type, champ_id, ugg_version
        );
        
        match client.get(&url).send().await {
            Ok(response) => {
                if let Ok(riot_json) = response.json::<Value>().await {
                    let builds = extract_builds_from_ugg(&riot_json, None);
                    
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
            }
            Err(e) => eprintln!("Error fetching builds for {}: {}", key, e),
        }
    }
    
    Ok(all_results)
}
