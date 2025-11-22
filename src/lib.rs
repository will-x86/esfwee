pub mod api;
pub mod storage;

use std::path::PathBuf;
use storage::kv::KVStore;

#[derive(Clone)]
pub struct AppState {
    pub kv_store: KVStore,
    pub image_dir: PathBuf,
}

impl AppState {
    pub fn new(kv_dir: PathBuf, image_dir: PathBuf) -> Self {
        Self {
            kv_store: KVStore::new(kv_dir),
            image_dir,
        }
    }
}
