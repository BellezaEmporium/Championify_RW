//Base for anything Riot CDN related

use anyhow::{Context, Result};
use reqwest::Client;
use serde_json::Value;

pub async fn get_riot_version(client: &Client) -> Result<String> {
    let response = client
        .get("https://ddragon.leagueoflegends.com/api/versions.json")
        .send()
        .await?;
    
    let versions: Vec<String> = response.json().await?;
    let latest_version = versions
        .get(0)
        .context("Could not get latest Riot version")?;
    
    Ok(latest_version.to_string())
}

pub async fn get_riot_champions(client: &Client, version: &str) -> Result<Value> {
    let url = format!(
        "https://ddragon.leagueoflegends.com/cdn/{}/data/en_US/champions.json",
        version
    );
    
    let response = client.get(&url).send().await?;
    let riot_json: Value = response.json().await?;
    
    Ok(riot_json)
}

pub async fn get_riot_items(client: &Client, version: &str) -> Result<Value> {
    let url = format!(
        "https://ddragon.leagueoflegends.com/cdn/{}/data/en_US/item.json",
        version
    );
    
    let response = client.get(&url).send().await?;
    let riot_json: Value = response.json().await?;
    
    Ok(riot_json)
}