// OP.GG Scraper
// API endpoints:
// - https://lol-api-champion.op.gg/api/meta/versions
// - https://lol-api-champion.op.gg/api/euw/champions/ranked
// - https://lol-api-champion.op.gg/api/euw/champions/ranked/{championId}/{position}/builds
// - https://lol-api-champion.op.gg/api/euw/champions/ranked/{championId}/{position}/items

use reqwest::{Client, header};
use serde::Deserialize;
use serde_json::Value;
use anyhow::{Result, Context};
use std::collections::HashSet;
use super::types::{SourceInfo, ItemBlock, Item, RiotJsonSR, BuildResult};

#[derive(Debug, Deserialize)]
struct BuildItem {
    ids: Vec<i64>,
    /// Win count - can be used for sorting by winrate
    #[allow(dead_code)]
    #[serde(default)]
    win: Option<i64>,
    /// Play count - can be used for sorting by pickrate
    #[allow(dead_code)]
    #[serde(default)]
    play: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct DepthGroup {
    depth: i32,
    items: Vec<BuildItem>,
}

pub fn source_info() -> SourceInfo {
    SourceInfo {
        name: "OP.GG".to_string(),
        id: "opgg".to_string(),
    }
}

fn create_headers() -> header::HeaderMap {
    let mut headers = header::HeaderMap::new();
    headers.insert(
        header::USER_AGENT,
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            .parse()
            .unwrap(),
    );
    headers.insert(header::ACCEPT, "application/json".parse().unwrap());
    headers.insert(header::ACCEPT_LANGUAGE, "en-US,en;q=0.9".parse().unwrap());
    headers.insert(header::CONNECTION, "keep-alive".parse().unwrap());
    headers
}

/// Get the current patch version from OP.GG API
pub async fn get_version(client: &Client) -> Result<String> {
    let headers = create_headers();
    let response = client
        .get("https://lol-api-champion.op.gg/api/meta/versions")
        .headers(headers)
        .send()
        .await?;
    
    let data: Value = response.json().await?;
    
    // The API returns { "data": ["14.24", "14.23", ...] }
    let version = data
        .get("data")
        .and_then(|d| d.as_array())
        .and_then(|arr| arr.first())
        .and_then(|v| v.as_str())
        .context("Version not found in response")?;
    
    Ok(version.to_string())
}

/// Get items by depth from single_items array
fn get_items_by_depth(single_items: &[DepthGroup], target_depth: i32) -> Option<&Vec<BuildItem>> {
    single_items
        .iter()
        .find(|d| d.depth == target_depth)
        .map(|d| &d.items)
}

/// Build item sets for a specific champion and position
async fn build_champion_position(
    client: &Client,
    champion_id: i64,
    champion_name: &str,
    position: &str,
    version: &str,
    max_builds: usize,
) -> Result<Vec<BuildResult>> {
    let headers = create_headers();
    let position_lower = position.to_lowercase();
    
    // Fetch /builds endpoint
    let builds_url = format!(
        "https://lol-api-champion.op.gg/api/euw/champions/ranked/{}/{}/builds",
        champion_id, position_lower
    );
    
    let builds_resp = client
        .get(&builds_url)
        .headers(headers.clone())
        .send()
        .await?;
    
    let builds_json: Value = builds_resp.json().await?;
    
    // Fetch /items endpoint for boots and starter items
    let items_url = format!(
        "https://lol-api-champion.op.gg/api/euw/champions/ranked/{}/{}/items",
        champion_id, position_lower
    );
    
    let items_resp = client
        .get(&items_url)
        .headers(headers)
        .send()
        .await?;
    
    let items_json: Value = items_resp.json().await?;
    
    // Parse combination_items and single_items from /builds
    let combination_items: Vec<DepthGroup> = builds_json
        .get("data")
        .and_then(|d| d.get("combination_items"))
        .and_then(|c| serde_json::from_value(c.clone()).ok())
        .unwrap_or_default();
    
    let single_items: Vec<DepthGroup> = builds_json
        .get("data")
        .and_then(|d| d.get("single_items"))
        .and_then(|s| serde_json::from_value(s.clone()).ok())
        .unwrap_or_default();
    
    if combination_items.is_empty() {
        return Ok(vec![]);
    }
    
    // Find maximum depth (should be 6 for full builds)
    let max_depth = combination_items
        .iter()
        .map(|d| d.depth)
        .max()
        .unwrap_or(0);
    
    if max_depth == 0 {
        return Ok(vec![]);
    }
    
    // Get full builds at max depth
    let empty_builds: Vec<BuildItem> = vec![];
    let full_builds = combination_items
        .iter()
        .find(|d| d.depth == max_depth)
        .map(|d| &d.items)
        .unwrap_or(&empty_builds);
    
    if full_builds.is_empty() {
        return Ok(vec![]);
    }
    
    // Get early (depth 2) and mid (depth 3) items
    let early_items = get_items_by_depth(&single_items, 2);
    let mid_items = get_items_by_depth(&single_items, 3);
    
    // Parse boots and starter items from /items
    let official_boots: Vec<BuildItem> = items_json
        .get("data")
        .and_then(|d| d.get("boots"))
        .and_then(|b| serde_json::from_value(b.clone()).ok())
        .unwrap_or_default();
    
    let official_starters: Vec<BuildItem> = items_json
        .get("data")
        .and_then(|d| d.get("starter_items"))
        .and_then(|s| serde_json::from_value(s.clone()).ok())
        .unwrap_or_default();
    
    let num_builds = max_builds.min(full_builds.len());
    let mut results = Vec::new();
    
    for i in 0..num_builds {
        let build_data = &full_builds[i];
        
        if build_data.ids.is_empty() {
            continue;
        }
        
        let full_build_ids: HashSet<String> = build_data
            .ids
            .iter()
            .map(|id| id.to_string())
            .collect();
        
        let mut blocks = Vec::new();
        
        // STARTER block
        if !official_starters.is_empty() {
            let starter_index = i % official_starters.len();
            let starter_items: Vec<Item> = official_starters[starter_index]
                .ids
                .iter()
                .map(|id| Item { id: id.to_string(), count: 1 })
                .collect();
            
            if !starter_items.is_empty() {
                blocks.push(ItemBlock {
                    block_type: "Starter Items".to_string(),
                    items: starter_items,
                });
            }
        }
        
        // CORE block (early + mid items that are in full build)
        let mut core_items = Vec::new();
        let mut core_ids = HashSet::new();
        
        for depth_items in [early_items, mid_items].iter().flatten() {
            if !depth_items.is_empty() {
                let index = i % depth_items.len();
                for item_id in &depth_items[index].ids {
                    let id_str = item_id.to_string();
                    if full_build_ids.contains(&id_str) && !core_ids.contains(&id_str) {
                        core_items.push(Item { id: id_str.clone(), count: 1 });
                        core_ids.insert(id_str);
                    }
                }
            }
        }
        
        if !core_items.is_empty() {
            blocks.push(ItemBlock {
                block_type: "Core Items".to_string(),
                items: core_items,
            });
        }
        
        // FINISH block (remaining full build items)
        let used_ids: HashSet<String> = blocks
            .iter()
            .flat_map(|b| b.items.iter().map(|item| item.id.clone()))
            .collect();
        
        let finish_items: Vec<Item> = build_data
            .ids
            .iter()
            .filter(|id| !used_ids.contains(&id.to_string()))
            .map(|id| Item { id: id.to_string(), count: 1 })
            .collect();
        
        if !finish_items.is_empty() {
            blocks.push(ItemBlock {
                block_type: "Final Items".to_string(),
                items: finish_items,
            });
        }
        
        // BOOTS block
        if !official_boots.is_empty() {
            let boots_index = i % official_boots.len();
            let boots_items: Vec<Item> = official_boots[boots_index]
                .ids
                .iter()
                .map(|id| Item { id: id.to_string(), count: 1 })
                .collect();
            
            if !boots_items.is_empty() {
                blocks.push(ItemBlock {
                    block_type: "Boots".to_string(),
                    items: boots_items,
                });
            }
        }
        
        // Skip if no valid items
        if blocks.is_empty() {
            continue;
        }
        
        let title = format!("OPGG {} {} #{} - {}", champion_name, position, i + 1, version);
        
        results.push(BuildResult {
            champ: champion_name.to_string(),
            file_prefix: position_lower.clone(),
            riot_json: RiotJsonSR {
                champion: champion_name.to_string(),
                title,
                blocks,
                map: Some("SR".to_string()),
            },
            source: "opgg".to_string(),
        });
    }
    
    Ok(results)
}

/// Get all Summoner's Rift builds from OP.GG
pub async fn get_sr(client: &Client) -> Result<Vec<BuildResult>> {
    let version = get_version(client).await?;
    let headers = create_headers();
    
    log::info!("OP.GG: Using version {}", version);
    
    // Get list of all champions
    let response = client
        .get("https://lol-api-champion.op.gg/api/euw/champions/ranked")
        .headers(headers)
        .send()
        .await?;
    
    let data: Value = response.json().await?;
    let champs_data = data
        .get("data")
        .and_then(|d| d.as_array())
        .context("Invalid champions data")?;
    
    let mut results = Vec::new();
    
    for champ in champs_data {
        let id = champ.get("id").and_then(|i| i.as_i64()).unwrap_or_default();
        let name = champ.get("name").and_then(|n| n.as_str()).unwrap_or_default();
        
        let positions: Vec<String> = champ
            .get("positions")
            .and_then(|p| p.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default();
        
        if positions.is_empty() || id == 0 {
            continue;
        }
        
        log::debug!("Processing OP.GG: {} (ID: {})", name, id);
        
        for position in &positions {
            match build_champion_position(client, id, name, position, &version, 2).await {
                Ok(builds) => {
                    results.extend(builds);
                }
                Err(e) => {
                    log::warn!("Failed to get builds for {} {}: {}", name, position, e);
                }
            }
            
            // Small delay to avoid rate limiting
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        }
    }
    
    log::info!("OP.GG: Fetched {} builds", results.len());
    Ok(results)
}

/// Get ARAM builds from OP.GG
/// TODO: Integrate with import_builds when aram option is enabled
#[allow(dead_code)]
pub async fn get_aram(client: &Client) -> Result<Vec<BuildResult>> {
    let version = get_version(client).await?;
    let headers = create_headers();
    
    log::info!("OP.GG ARAM: Using version {}", version);
    
    // Get list of all champions for ARAM
    let response = client
        .get("https://lol-api-champion.op.gg/api/euw/champions/aram")
        .headers(headers.clone())
        .send()
        .await?;
    
    let data: Value = response.json().await?;
    let champs_data = data
        .get("data")
        .and_then(|d| d.as_array())
        .context("Invalid ARAM champions data")?;
    
    let mut results = Vec::new();
    
    for champ in champs_data {
        let id = champ.get("id").and_then(|i| i.as_i64()).unwrap_or_default();
        let name = champ.get("name").and_then(|n| n.as_str()).unwrap_or_default();
        
        if id == 0 {
            continue;
        }
        
        // Fetch ARAM builds
        let builds_url = format!(
            "https://lol-api-champion.op.gg/api/euw/champions/aram/{}/NONE/builds",
            id
        );
        
        let builds_resp = match client.get(&builds_url).headers(headers.clone()).send().await {
            Ok(r) => r,
            Err(_) => continue,
        };
        
        let builds_json: Value = match builds_resp.json().await {
            Ok(j) => j,
            Err(_) => continue,
        };
        
        // Fetch items
        let items_url = format!(
            "https://lol-api-champion.op.gg/api/euw/champions/aram/{}/NONE/items",
            id
        );
        
        let items_resp = match client.get(&items_url).headers(headers.clone()).send().await {
            Ok(r) => r,
            Err(_) => continue,
        };
        
        let items_json: Value = match items_resp.json().await {
            Ok(j) => j,
            Err(_) => continue,
        };
        
        // Parse builds (similar logic to SR)
        let combination_items: Vec<DepthGroup> = builds_json
            .get("data")
            .and_then(|d| d.get("combination_items"))
            .and_then(|c| serde_json::from_value(c.clone()).ok())
            .unwrap_or_default();
        
        if combination_items.is_empty() {
            continue;
        }
        
        let max_depth = combination_items.iter().map(|d| d.depth).max().unwrap_or(0);
        
        let empty_builds: Vec<BuildItem> = vec![];
        let full_builds = combination_items
            .iter()
            .find(|d| d.depth == max_depth)
            .map(|d| &d.items)
            .unwrap_or(&empty_builds);
        
        if full_builds.is_empty() {
            continue;
        }
        
        // Get first build only for ARAM
        let build_data = &full_builds[0];
        if build_data.ids.is_empty() {
            continue;
        }
        
        let mut blocks = Vec::new();
        
        // Starter items
        if let Some(starters) = items_json.get("data").and_then(|d| d.get("starter_items")) {
            let starters: Vec<BuildItem> = serde_json::from_value(starters.clone()).unwrap_or_default();
            if !starters.is_empty() {
                let starter_items: Vec<Item> = starters[0]
                    .ids
                    .iter()
                    .map(|id| Item { id: id.to_string(), count: 1 })
                    .collect();
                
                if !starter_items.is_empty() {
                    blocks.push(ItemBlock {
                        block_type: "Starter Items".to_string(),
                        items: starter_items,
                    });
                }
            }
        }
        
        // Full build items
        let full_items: Vec<Item> = build_data
            .ids
            .iter()
            .map(|id| Item { id: id.to_string(), count: 1 })
            .collect();
        
        if !full_items.is_empty() {
            blocks.push(ItemBlock {
                block_type: "Full Build".to_string(),
                items: full_items,
            });
        }
        
        if !blocks.is_empty() {
            let title = format!("OPGG ARAM {} - {}", name, version);
            
            results.push(BuildResult {
                champ: name.to_string(),
                file_prefix: "aram".to_string(),
                riot_json: RiotJsonSR {
                    champion: name.to_string(),
                    title,
                    blocks,
                    map: Some("HA".to_string()),
                },
                source: "opgg".to_string(),
            });
        }
        
        // Rate limiting
        tokio::time::sleep(std::time::Duration::from_millis(30)).await;
    }
    
    log::info!("OP.GG ARAM: Fetched {} builds", results.len());
    Ok(results)
}
