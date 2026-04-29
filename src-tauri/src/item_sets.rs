// Item sets module - generates and writes LoL item set JSON files
use crate::error::AppError;
use crate::scrapers::types::{Build, Item, ItemBlock};
use serde::{Deserialize, Serialize};
use tokio::fs;
use std::path::Path;
use std::sync::Arc;
use tokio::sync::Semaphore;

/// Full Riot Games item set format with all official fields
#[derive(Debug, Serialize, Deserialize)]
pub struct ItemSet {
    title: String,
    #[serde(rename = "type")]
    set_type: String,
    map: String,
    mode: String,
    priority: bool,
    sortrank: u32,
    blocks: Vec<Block>,
}

/// Riot Games block format with conditional display rules
#[derive(Debug, Serialize, Deserialize)]
pub struct Block {
    #[serde(rename = "type")]
    block_type: String,
    #[serde(rename = "recMath")]
    rec_math: bool,
    #[serde(rename = "recSteps")]
    rec_steps: bool,
    #[serde(rename = "minSummonerLevel")]
    min_summoner_level: i32,
    #[serde(rename = "maxSummonerLevel")]
    max_summoner_level: i32,
    #[serde(rename = "showIfSummonerSpell")]
    show_if_summoner_spell: String,
    #[serde(rename = "hideIfSummonerSpell")]
    hide_if_summoner_spell: String,
    items: Vec<BlockItem>,
}

/// Riot Games item format
#[derive(Debug, Serialize, Deserialize)]
pub struct BlockItem {
    id: String,
    count: u32,
}

impl From<&Item> for BlockItem {
    fn from(item: &Item) -> Self {
        BlockItem {
            id: item.id.clone(),
            count: item.count,
        }
    }
}

impl From<&ItemBlock> for Block {
    fn from(item_block: &ItemBlock) -> Self {
        Block {
            block_type: item_block.block_type.clone(),
            rec_math: false,
            rec_steps: false,
            min_summoner_level: -1,
            max_summoner_level: -1,
            show_if_summoner_spell: String::new(),
            hide_if_summoner_spell: String::new(),
            items: item_block.items.iter().map(BlockItem::from).collect(),
        }
    }
}

/// Convert a Build to LoL item set JSON format
pub fn build_to_item_set(build: &Build) -> ItemSet {
    ItemSet {
        title: build.title.clone(),
        set_type: "custom".to_string(),
        map: "SR".to_string(), // Summoner's Rift
        mode: "CLASSIC".to_string(),
        priority: false,
        sortrank: 0,
        blocks: build.items.iter().map(Block::from).collect(),
    }
}

/// Write an item set to disk in League of Legends format
pub async fn write_item_set(
    dir_path: &Path, 
    champion: &str, 
    index: usize, 
    item_set: &ItemSet
) -> Result<(), AppError> {
    let file_name = format!("{}_{}.json", champion, index);
    let file_path = dir_path.join(file_name);

    let json_bytes = serde_json::to_vec(item_set)
        .map_err(|e| AppError::Parse(format!("Failed to serialize {}: {}", champion, e)))?;

    fs::write(&file_path, json_bytes)
        .await
        .map_err(|e| AppError::Io(e))?;

    Ok(())
}

/// Delete all Championify item sets for a champion
pub async fn delete_champion_builds(item_sets_path: &Path, champion: &str) -> Result<(), AppError> {
    let recommended_dir = item_sets_path.join(champion).join("Recommended");
    
    let mut dir_entries = match fs::read_dir(&recommended_dir).await {
        Ok(entries) => entries,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) => return Err(AppError::Io(e)),
    };

    while let Some(entry) = dir_entries.next_entry().await? {
        let path = entry.path();
        
        let is_target_file = path.file_name()
            .and_then(|name| name.to_str())
            .map(|name| name.starts_with("Championify_") && name.ends_with(".json"))
            .unwrap_or(false);

        if is_target_file {
            fs::remove_file(&path).await?;
            log::debug!("Deleted item set: {:?}", path);
        }
    }
    
    Ok(())
}

/// Delete all Championify item sets for all champions
pub async fn delete_all_builds(item_sets_path: &Path) -> Result<(), AppError> {
    let mut dir_entries = match fs::read_dir(item_sets_path).await {
        Ok(entries) => entries,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) => return Err(AppError::Io(e)),
    };
    
    let semaphore = Arc::new(Semaphore::new(10));
    let mut deletion_tasks = Vec::new();

    while let Some(entry) = dir_entries.next_entry().await? {
        if entry.file_type().await?.is_dir() {
            if let Some(champion_name) = entry.file_name().to_str() {
                let item_sets_path_clone = item_sets_path.to_path_buf();
                let champion_name_clone = champion_name.to_string();
                
                let permit = semaphore.clone().acquire_owned().await
                    .expect("Semaphore closed"); 

                deletion_tasks.push(tokio::spawn(async move {
                    let res = delete_champion_builds(&item_sets_path_clone, &champion_name_clone).await;
                    drop(permit);
                    res
                }));
            }
        }
    }

    for task in deletion_tasks {
        match task.await {
            Ok(Ok(())) => {} // Succès total
            Ok(Err(app_err)) => log::error!("Failed to delete item sets: {}", app_err), // Erreur métier (AppError)
            Err(join_err) => log::error!("Task panicked or cancelled: {}", join_err),   // Erreur Tokio (JoinError)
        }
    }

    log::info!("Deleted all Championify item sets");
    Ok(())
}

/// Count existing Championify item sets
pub async fn count_builds(item_sets_path: &Path) -> Result<usize, AppError> {
    let mut count = 0;
    
    let mut dir_entries = match fs::read_dir(item_sets_path).await {
        Ok(entries) => entries,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(0),
        Err(e) => return Err(AppError::Io(e)),
    };

    while let Some(entry) = dir_entries.next_entry().await? {
        let champion_dir = entry.path().join("Recommended");
        
        if let Ok(mut files) = fs::read_dir(&champion_dir).await {
            while let Some(file) = files.next_entry().await? {
                let is_target = file.file_name()
                    .to_str()
                    .map(|name| name.starts_with("Championify_") && name.ends_with(".json"))
                    .unwrap_or(false);

                if is_target {
                    count += 1;
                }
            }
        }
    }
    
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_to_item_set() {
        let build = Build {
            champion: "Ahri".to_string(),
            role: "Mid".to_string(),
            title: "Ahri Mid - Test".to_string(),
            items: vec![ItemBlock {
                block_type: "Starting Items".to_string(),
                items: vec![Item {
                    id: "1001".to_string(),
                    count: 1,
                }],
            }],
            skills: None,
        };

        let item_set = build_to_item_set(&build);
        assert_eq!(item_set.title, "Ahri Mid - Test");
        assert_eq!(item_set.blocks.len(), 1);
        assert_eq!(item_set.map, "SR");
        assert_eq!(item_set.mode, "CLASSIC");
    }
}
