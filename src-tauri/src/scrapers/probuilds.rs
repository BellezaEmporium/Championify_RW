use std::time::Duration;

use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value};
use anyhow::{Result, Context};
use crate::{error::AppError, riot_cdn::get_riot_champions, scrapers::{BuildScraper, ScraperContext, registry::ScraperHealth}};

use super::{SourceInfo, ItemBlock, Item, RiotJsonSR, BuildResult, Champion};

pub struct ProBuildsScraper;

#[async_trait]
impl BuildScraper for ProBuildsScraper {

    fn source_info(&self) -> SourceInfo {
        SourceInfo {
            name: "ProBuilds".to_string(),
            id: "probuilds".to_string(),
        }
    }

    async fn get_version(&self, client: &Client) -> Result<String, AppError> {
        let response = client
            .get("https://utils.iesdev.com/static/json/lol/riot/versions")
            .header("Content-Type", "application/json")
            .timeout(Duration::from_secs(10))
            .send()
            .await?;
        
        let versions: Vec<String> = response.json().await?;
        Ok(versions.first().cloned().unwrap_or_default())
    }

    async fn get_sr(&self, client: &Client, context: &ScraperContext, _role: Option<&str>) -> Result<Vec<BuildResult>, AppError> {
        let positions = ["TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];
        let version = context.riot_version.clone();
        let champions = get_riot_champions(client, &version).await?;
        
        let mut results = Vec::new();
        
        for champion_value in champions.as_array().context("Champions is not an array")? {
            let champion: Champion = match serde_json::from_value(champion_value.clone()) {
                Ok(champ) => champ,
                Err(e) => {
                    eprintln!("Failed to parse champion: {}", e);
                    continue;
                }
            };

            for position in &positions {
                match get_items(client, &champion, position).await {
                    Ok(build) => results.push(build),
                    Err(e) => eprintln!("Error for {} {}: {}", champion.name, position, e),
                }
            }
        }
        
        Ok(results)
    }
    async fn check_health(&self, client: &Client) -> ScraperHealth {
        match self.get_version(client).await {
            Ok(_) => ScraperHealth::Available,
            Err(_) => ScraperHealth::Down,
        }
    }
    async fn needs_riot_version(&self) -> bool {
        false
    }
}

async fn get_items(client: &Client, champion: &Champion, position: &str) -> Result<BuildResult, AppError> {
    println!("Processing ProBuilds: {} - {}", champion.name, position);
    
    let query = r#"
        query ChampionBuildsTagged($championId:String! $queue:String! $role:String) {
            executeDatabricksQuery(
                game: LEAGUE
                queryName: "prod_champion_builds_tags"
                params: [
                    {name: "individual_position", value: $role}
                    {name: "queue_id", value: $queue}
                    {name: "champion_id", value: $championId}
                ]
            ) {
                payload
            }
        }
    "#;
    
    let variables = json!({
        "championId": champion.id,
        "queue": "RANKED_SOLO_5X5",
        "role": position,
    });
    
    let response = client
        .post("https://datalake.v2.iesdev.com/graphql")
        .header("Content-Type", "application/json")
        .json(&json!({
            "query": query,
            "variables": variables,
        }))
        .send()
        .await?;
    
    let json: Value = response.json().await?;
    if let Some(errors) = json.get("errors") {
        return Err(AppError::Custom(format!("GraphQL errors: {}", errors)));
    }
    let data_array = json
        .pointer("/data/executeDatabricksQuery/payload/result/dataArray")
        .and_then(|v| v.as_array())
        .context("No builds data found")?;
    
    let item_builds_json = data_array
        .get(0)
        .and_then(|arr| arr.get(8))
        .and_then(|v| v.as_str())
        .unwrap_or("[]");
    
    let item_builds: Vec<Value> = serde_json::from_str(item_builds_json).unwrap_or_default();
    
    let blocks: Vec<ItemBlock> = item_builds
        .iter()
        .filter_map(|build| {
            let item_ids = build.get("itemIds")?.as_str()?;
            let items: Vec<Item> = item_ids
                .split(',')
                .map(|id| Item {
                    id: id.to_string(),
                    count: 1,
                })
                .collect();
            
            Some(ItemBlock {
                block_type: "Most Popular".to_string(),
                items,
            })
        })
        .collect();
    
    let title = data_array
        .get(0)
        .and_then(|arr| arr.get(0))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    
    Ok(BuildResult {
        champ: champion.name.clone(),
        file_prefix: "all".to_string(),
        riot_json: RiotJsonSR {
            champion: champion.id.clone(),
            title: format!("ProBuilds {}", title),
            blocks,
            map: None,
        },
        source: "probuilds".to_string(),
    })
}
