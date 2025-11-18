use reqwest::Client;
use serde_json::{json, Value};
use anyhow::{Result, Context};
use super::{SourceInfo, ItemBlock, Item, RiotJsonSR, BuildResult, Champion};

pub fn source_info() -> SourceInfo {
    SourceInfo {
        name: "ProBuilds".to_string(),
        id: "probuilds".to_string(),
    }
}

pub async fn get_version(client: &Client) -> Result<String> {
    let response = client
        .get("https://utils.iesdev.com/static/json/lol/riot/versions")
        .header("Content-Type", "application/json")
        .send()
        .await?;
    
    let versions: Vec<String> = response.json().await?;
    Ok(versions.first().cloned().unwrap_or_default())
}

async fn get_champs(client: &Client) -> Result<Vec<Champion>> {
    let version = get_version(client).await?;
    let url = format!(
        "https://blitz-cdn-plain.blitz.gg/blitz/ddragon/{}/data/en_US/champions.json",
        version
    );
    
    let response = client.get(&url).send().await?;
    let data: Value = response.json().await?;
    
    let champions = data
        .get("champions")
        .and_then(|c| c.as_array())
        .context("No champions found")?;
    
    Ok(champions
        .iter()
        .filter_map(|champ| {
            Some(Champion {
                id: champ.get("key")?.as_str()?.to_string(),
                name: champ.get("name")?.as_str()?.to_string(),
            })
        })
        .collect())
}

async fn get_items(client: &Client, champion: &Champion, position: &str) -> Result<BuildResult> {
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

pub async fn get_sr(client: &Client) -> Result<Vec<BuildResult>> {
    let positions = ["TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];
    let champions = get_champs(client).await?;
    
    let mut results = Vec::new();
    
    for champion in &champions {
        for position in &positions {
            match get_items(client, champion, position).await {
                Ok(build) => results.push(build),
                Err(e) => eprintln!("Error for {} {}: {}", champion.name, position, e),
            }
        }
    }
    
    Ok(results)
}
