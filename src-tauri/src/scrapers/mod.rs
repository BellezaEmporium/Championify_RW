use once_cell::sync::Lazy;
use std::collections::HashMap;

// Declare the types module and re-export all types
pub mod types;
pub use types::*;

pub mod ugg;
pub mod opgg;
pub mod probuilds;
pub mod koreanbuilds;
pub mod trackergg;
pub mod registry;

// Source registry
pub static SOURCES: Lazy<HashMap<&'static str, SourceInfo>> = Lazy::new(|| {
    let mut map = HashMap::new();
    map.insert("ugg", ugg::source_info());
    map.insert("opgg", opgg::source_info());
    map.insert("probuilds", probuilds::source_info());
    map.insert("koreanbuilds", koreanbuilds::source_info());
    map.insert("trackergg", trackergg::source_info());
    map
});

pub fn sources_info() -> Vec<SourceInfo> {
    let mut sources: Vec<_> = SOURCES.values().cloned().collect();
    sources.sort_by(|a, b| a.name.cmp(&b.name));
    sources
}
