use reqwest::{Client, header};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use anyhow::{Result, Context};
use super::{SourceInfo, ItemBlock, Item, RiotJsonSR, BuildResult};

#[derive(Debug, Deserialize)]
struct RateEntry {
    items: Vec<u32>,
    #[serde(rename = "win_rate")]
    winrate: f64,
    #[serde(rename = "pick_rate")]
    pickrate: f64,
}

#[derive(Debug, Deserialize)]
struct SkillData {
    #[serde(rename = "skill_masteries")]
    skill_masteries: Option<Vec<SkillMastery>>,
}

#[derive(Debug, Deserialize)]
struct SkillMastery {
    ids: Vec<String>,
    #[serde(rename = "play")]
    play_count: u32,
    #[serde(rename = "win")]
    win_count: u32,
}

#[derive(Debug, Deserialize)]
struct BuildData {
    #[serde(rename = "starter_items")]
    starter_items: Option<Vec<RateEntry>>,
    #[serde(rename = "core_items")]
    core_items: Option<Vec<RateEntry>>,
    boots: Option<Vec<RateEntry>>,
    #[serde(rename = "item_6")]
    item_6: Option<Vec<RateEntry>>,
}

pub fn source_info() -> SourceInfo {
    SourceInfo {
        name: "op.gg".to_string(),
        id: "opgg".to_string(),
    }
}

fn create_headers() -> header::HeaderMap {
    let mut headers = header::HeaderMap::new();
    headers.insert(
        header::ACCEPT_LANGUAGE,
        "en-US,en;q=0.8,fr;q=0.6,es;q=0.4".parse().unwrap(),
    );
    headers.insert(header::COOKIE, "customLocale=en_US".parse().unwrap());
    headers.insert(
        header::USER_AGENT,
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36"
            .parse()
            .unwrap(),
    );
    headers.insert("X-Requested-With", "XMLHttpRequest".parse().unwrap());
    headers
}

pub async fn get_version(client: &Client) -> Result<String> {
    let headers = create_headers();
    let response = client
        .get("https://lol-api-champion.op.gg/api/meta/champions")
        .headers(headers)
        .send()
        .await?;
    
    let data: Value = response.json().await?;
    let version = data
        .get("meta")
        .and_then(|m| m.get("version"))
        .and_then(|v| v.as_str())
        .context("Version not found in response")?;
    
    Ok(version.to_string())
}

fn pick_winrate(entry: &RateEntry) -> f64 {
    entry.winrate
}

fn pick_pickrate(entry: &RateEntry) -> f64 {
    entry.pickrate
}

fn create_frequent_block(
    title: &str,
    items: &[RateEntry],
    appended_items: Vec<String>,
) -> Option<ItemBlock> {
    let entry = items.iter().max_by(|a, b| {
        pick_pickrate(a).partial_cmp(&pick_pickrate(b)).unwrap()
    })?;
    
    let winrate = (entry.winrate * 100.0).round() as u32;
    let pickrate = (entry.pickrate * 100.0).round() as u32;
    
    let mut all_items: Vec<Item> = entry
        .items
        .iter()
        .map(|id| Item {
            id: id.to_string(),
            count: 1,
        })
        .collect();
    
    all_items.extend(appended_items.into_iter().map(|id| Item { id, count: 1 }));
    
    Some(ItemBlock {
        block_type: format!("{} - Winrate: {}%, Pickrate: {}%", title, winrate, pickrate),
        items: all_items,
    })
}

fn create_highest_block(
    title: &str,
    items: &[RateEntry],
    appended_items: Vec<String>,
) -> Option<ItemBlock> {
    let entry = items.iter().max_by(|a, b| {
        pick_winrate(a).partial_cmp(&pick_winrate(b)).unwrap()
    })?;
    
    let winrate = (entry.winrate * 100.0).round() as u32;
    let pickrate = (entry.pickrate * 100.0).round() as u32;
    
    let mut all_items: Vec<Item> = entry
        .items
        .iter()
        .map(|id| Item {
            id: id.to_string(),
            count: 1,
        })
        .collect();
    
    all_items.extend(appended_items.into_iter().map(|id| Item { id, count: 1 }));
    
    Some(ItemBlock {
        block_type: format!("{} - Winrate: {}%, Pickrate: {}%", title, winrate, pickrate),
        items: all_items,
    })
}

fn create_combined_block(
    title: &str,
    frequent: &[RateEntry],
    highest: &[RateEntry],
    appended_items: Vec<String>,
) -> Option<ItemBlock> {
    let freq_entry = frequent.iter().max_by(|a, b| {
        pick_pickrate(a).partial_cmp(&pick_pickrate(b)).unwrap()
    })?;
    
    let high_entry = highest.iter().max_by(|a, b| {
        pick_winrate(a).partial_cmp(&pick_winrate(b)).unwrap()
    })?;
    
    // Use the one with higher winrate
    let entry = if freq_entry.winrate >= high_entry.winrate {
        freq_entry
    } else {
        high_entry
    };
    
    let winrate = (entry.winrate * 100.0).round() as u32;
    let pickrate = (entry.pickrate * 100.0).round() as u32;
    
    let mut all_items: Vec<Item> = entry
        .items
        .iter()
        .map(|id| Item {
            id: id.to_string(),
            count: 1,
        })
        .collect();
    
    all_items.extend(appended_items.into_iter().map(|id| Item { id, count: 1 }));
    
    Some(ItemBlock {
        block_type: format!("Frequent/Highest {} - Winrate: {}%, Pickrate: {}%", title, winrate, pickrate),
        items: all_items,
    })
}

pub async fn get_sr(client: &Client) -> Result<Vec<BuildResult>> {
    let version = get_version(client).await?;
    let headers = create_headers();
    
    let response = client
        .get("https://lol-api-champion.op.gg/api/euw/champions/ranked")
        .headers(headers.clone())
        .send()
        .await?;
    
    let data: Value = response.json().await?;
    let champs_data = data
        .get("data")
        .and_then(|d| d.as_array())
        .context("Invalid champions data")?;
    
    let mut results = Vec::new();
    
    for champ in champs_data {
        let id = champ.get("id").and_then(|i| i.as_str()).unwrap_or_default();
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
        
        if positions.is_empty() {
            continue;
        }
        
        println!("Processing op.gg: {}", name);
        
        for position in &positions {
            // Fetch build data
            let build_url = format!(
                "https://lol-api-champion.op.gg/api/euw/champions/ranked/{}/{}/build",
                id, position
            );
            
            let build_resp = match client.get(&build_url).headers(headers.clone()).send().await {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("Error fetching build for {} {}: {}", name, position, e);
                    continue;
                }
            };
            
            let build_json: Value = match build_resp.json().await {
                Ok(j) => j,
                Err(e) => {
                    eprintln!("Error parsing build JSON for {} {}: {}", name, position, e);
                    continue;
                }
            };
            
            let mut blocks = Vec::new();
            
            // Parse build data
            if let Some(data) = build_json.get("data") {
                // Starter items
                if let Some(starter) = data.get("starter_items").and_then(|s| s.as_array()) {
                    let entries: Vec<RateEntry> = starter.iter()
                        .filter_map(|v| serde_json::from_value(v.clone()).ok())
                        .collect();
                    
                    if !entries.is_empty() {
                        if let Some(block) = create_frequent_block("Frequent Starters", &entries, vec![]) {
                            blocks.push(block);
                        }
                        if let Some(block) = create_highest_block("Highest Win Starters", &entries, vec![]) {
                            blocks.push(block);
                        }
                    }
                }
                
                // Core items
                if let Some(core) = data.get("core_items").and_then(|c| c.as_array()) {
                    let entries: Vec<RateEntry> = core.iter()
                        .filter_map(|v| serde_json::from_value(v.clone()).ok())
                        .collect();
                    
                    if !entries.is_empty() {
                        if let Some(block) = create_frequent_block("Frequent Core", &entries, vec![]) {
                            blocks.push(block);
                        }
                        if let Some(block) = create_highest_block("Highest Win Core", &entries, vec![]) {
                            blocks.push(block);
                        }
                    }
                }
                
                // Boots
                if let Some(boots) = data.get("boots").and_then(|b| b.as_array()) {
                    let entries: Vec<RateEntry> = boots.iter()
                        .filter_map(|v| serde_json::from_value(v.clone()).ok())
                        .collect();
                    
                    if !entries.is_empty() {
                        if let Some(entry) = entries.iter().max_by(|a, b| {
                            pick_pickrate(a).partial_cmp(&pick_pickrate(b)).unwrap()
                        }) {
                            blocks.push(ItemBlock {
                                block_type: "Boots".to_string(),
                                items: entry.items.iter().map(|id| Item {
                                    id: id.to_string(),
                                    count: 1,
                                }).collect(),
                            });
                        }
                    }
                }
                
                // Final items
                if let Some(item_6) = data.get("item_6").and_then(|i| i.as_array()) {
                    let entries: Vec<RateEntry> = item_6.iter()
                        .filter_map(|v| serde_json::from_value(v.clone()).ok())
                        .collect();
                    
                    if !entries.is_empty() {
                        if let Some(block) = create_frequent_block("Frequent Final Items", &entries, vec![]) {
                            blocks.push(block);
                        }
                    }
                }
            }
            
            let title = format!("OPGG {} {} - {}", name, position, version);
            results.push(BuildResult {
                champ: name.to_string(),
                file_prefix: position.to_lowercase(),
                riot_json: RiotJsonSR {
                    champion: name.to_string(),
                    title,
                    blocks,
                    map: Some("SR".to_string()),
                },
                source: "opgg".to_string(),
            });
        }
    }
    
    Ok(results)
}