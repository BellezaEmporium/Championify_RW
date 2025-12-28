use serde::{Deserialize, Serialize};

// Scraper metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceInfo {
    pub name: String,
    pub id: String,
}

// Champion info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Champion {
    pub id: String,
    pub name: String,
}

// Simple item representation for scrapers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub count: u32,
}

// Simple block representation for scrapers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    pub items: Vec<Item>,
}

// Riot JSON format (Summoner's Rift)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiotJsonSR {
    pub champion: String,
    pub title: String,
    pub blocks: Vec<ItemBlock>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub map: Option<String>,
}

// Riot JSON format (ARAM)
#[allow(dead_code)] // For future ARAM support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiotJsonARAM {
    pub champion: String,
    pub title: String,
    pub blocks: Vec<ItemBlock>,
    pub map: String,
}

// Build result from scrapers - represents raw scraped data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildResult {
    pub champ: String,
    pub file_prefix: String,
    pub riot_json: RiotJsonSR,
    pub source: String,
}

// Build representation (standardized internal format)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Build {
    pub champion: String,
    pub role: String,
    pub title: String,
    pub items: Vec<ItemBlock>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub skills: Option<Vec<String>>,
}

impl BuildResult {
    /// Convert scraped result to standardized Build format
    #[allow(dead_code)]
    pub fn to_build(&self) -> Build {
        Build {
            champion: self.champ.clone(),
            role: self.file_prefix.clone(),
            title: self.riot_json.title.clone(),
            items: self.riot_json.blocks.clone(),
            skills: None,
        }
    }
}
