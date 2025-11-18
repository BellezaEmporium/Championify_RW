// Item sets module - generates and writes LoL item set JSON files
use crate::error::Result;
use crate::scrapers::types::{Build, Item, ItemBlock};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

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
pub fn write_item_set(
    item_sets_path: &Path,
    champion: &str,
    build_index: usize,
    item_set: &ItemSet,
) -> Result<()> {
    // Create champion directory structure
    let recommended_dir = item_sets_path
        .join(champion)
        .join("Recommended");
    
    fs::create_dir_all(&recommended_dir)?;
    
    // Generate filename
    let filename = format!("Championify_{}.json", build_index);
    let file_path = recommended_dir.join(filename);
    
    // Write JSON
    let json = serde_json::to_string_pretty(item_set)?;
    fs::write(&file_path, json)?;
    
    log::info!("Wrote item set to {:?}", file_path);
    Ok(())
}

/// Delete all Championify item sets for a champion
pub fn delete_champion_builds(item_sets_path: &Path, champion: &str) -> Result<()> {
    let recommended_dir = item_sets_path.join(champion).join("Recommended");
    
    if !recommended_dir.exists() {
        return Ok(());
    }
    
    for entry in fs::read_dir(&recommended_dir)?.flatten() {
        let path = entry.path();
        if let Some(filename) = path.file_name().and_then(|f| f.to_str()) {
            if filename.starts_with("Championify_") && filename.ends_with(".json") {
                fs::remove_file(&path)?;
                log::info!("Deleted item set: {:?}", path);
            }
        }
    }
    
    Ok(())
}

/// Delete all Championify item sets for all champions
pub fn delete_all_builds(item_sets_path: &Path) -> Result<()> {
    if !item_sets_path.exists() {
        return Ok(());
    }
    
    for entry in fs::read_dir(item_sets_path)?.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(champion) = path.file_name().and_then(|f| f.to_str()) {
                delete_champion_builds(item_sets_path, champion)?;
            }
        }
    }
    
    log::info!("Deleted all Championify item sets");
    Ok(())
}

/// Count existing Championify item sets
pub fn count_builds(item_sets_path: &Path) -> Result<usize> {
    if !item_sets_path.exists() {
        return Ok(0);
    }
    
    let mut count = 0;
    
    for entry in fs::read_dir(item_sets_path)?.flatten() {
        let champion_dir = entry.path().join("Recommended");
        if champion_dir.exists() {
            if let Ok(files) = fs::read_dir(&champion_dir) {
                count += files
                    .flatten()
                    .filter(|file| {
                        file.path()
                            .file_name()
                            .and_then(|f| f.to_str())
                            .map(|name| name.starts_with("Championify_") && name.ends_with(".json"))
                            .unwrap_or(false)
                    })
                    .count();
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
