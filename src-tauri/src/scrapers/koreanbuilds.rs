use reqwest::{Client, header};
use serde_json::Value;
use anyhow::{Result, Context};
use super::{SourceInfo, ItemBlock, Item, RiotJsonSR, BuildResult};

const API_KEY: &str = "QmFzaWMga2ItZnJvbnRlbmQgVDNNMWV3dUhqMlF3c1dC";

pub fn source_info() -> SourceInfo {
    SourceInfo {
        name: "KoreanBuilds".to_string(),
        id: "koreanbuilds".to_string(),
    }
}

fn create_headers() -> header::HeaderMap {
    let mut headers = header::HeaderMap::new();
    headers.insert(header::AUTHORIZATION, API_KEY.parse().unwrap());
    headers.insert(header::ACCEPT, "application/json".parse().unwrap());
    headers.insert(
        header::USER_AGENT,
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
            .parse()
            .unwrap(),
    );
    headers
}

pub async fn get_version(client: &Client) -> Result<String> {
    let headers = create_headers();
    let response = client
        .get("https://api.koreanbuilds.net/champions?patchid=-1")
        .headers(headers)
        .send()
        .await?;
    
    let data: Value = response.json().await?;
    // log the data for debugging
    let _ = serde_json::to_string_pretty(&data).map(|s| println!("Version Data: {}", s));
    let version = data
        .get("patches")
        .and_then(|p| p.get("0"))
        .and_then(|p| p.get("patchVersion"))
        .and_then(|v| v.as_str())
        .context("Version not found")?;
    
    Ok(version.to_string())
}

pub async fn get_sr(client: &Client) -> Result<Vec<BuildResult>> {
    let version = get_version(client).await?;
    let headers = create_headers();
    
    let response = client
        .get("https://api.koreanbuilds.net/champions?patchid=-1")
        .headers(headers.clone())
        .send()
        .await?;
    
    let data: Value = response.json().await?;
    let champions = data
        .get("champions")
        .and_then(|c| c.as_array())
        .context("No champions found")?;
    
    let mut results = Vec::new();
    
    for champ in champions {
        let name = champ.get("name").and_then(|n| n.as_str()).unwrap_or_default();
        let id = champ.get("id").and_then(|i| i.as_u64()).unwrap_or_default();
        
        if id == 0 {
            continue;
        }
        
        println!("Processing KoreanBuilds: {}", name);
        
        // Extract roles from builds
        let roles = extract_roles(champ);
        
        for role in &roles {
            let build_url = format!(
                "https://api.koreanbuilds.net/builds?chmpname={}&patchid=-1",
                name
            );
            
            match client.get(&build_url).headers(headers.clone()).send().await {
                Ok(resp) => {
                    if let Ok(build_data) = resp.json::<Value>().await {
                        let blocks = parse_builds(&build_data);
                        
                        results.push(BuildResult {
                            champ: name.to_string(),
                            file_prefix: role.to_lowercase(),
                            riot_json: RiotJsonSR {
                                champion: name.to_string(),
                                title: format!("KRB {} {}", role, version),
                                blocks,
                                map: None
                            },
                            source: "koreanbuilds".to_string(),
                        });
                    }
                }
                Err(e) => eprintln!("Error fetching builds for {}: {}", name, e),
            }
        }
    }
    
    Ok(results)
}

fn extract_roles(champ: &Value) -> Vec<String> {
    if let Some(builds) = champ.get("builds").and_then(|b| b.as_object()) {
        return builds
            .iter()
            .filter(|(_, v)| {
                v.as_u64().map(|n| n > 0).unwrap_or(false)
            })
            .map(|(k, _)| k.clone())
            .collect();
    }
    vec!["All".to_string()]
}

fn parse_builds(build_data: &Value) -> Vec<ItemBlock> {
    let mut blocks = Vec::new();
    
    // Try builds2 first, then builds3
    let builds = build_data
        .get("builds2")
        .or_else(|| build_data.get("builds3"))
        .and_then(|b| b.as_array());
    
    if let Some(builds_arr) = builds {
        for build in builds_arr.iter().take(4) {
            if let Some(item_sets) = build.get("itemSets").and_then(|s| s.as_array()) {
                for item_set in item_sets {
                    let items: Vec<Item> = item_set
                        .as_array()
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|id| Some(Item {
                                    id: id.as_u64()?.to_string(),
                                    count: 1,
                                }))
                                .collect()
                        })
                        .unwrap_or_default();
                    
                    blocks.push(ItemBlock {
                        block_type: "Core Items".to_string(),
                        items,
                    });
                }
            }
        }
    }
    
    blocks
}