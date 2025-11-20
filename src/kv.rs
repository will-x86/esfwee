use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct KVStore {
    store: Arc<RwLock<HashMap<String, Vec<u8>>>>,
}

// Format something like:
// bucket/object-key : data
// bucket: bucketdata
impl KVStore {
    pub fn new() -> Self {
        Self {
            store: Default::default(),
        }
    }
    pub async fn put(&mut self, key: impl Into<String>, value: Vec<u8>) {
        let mut w = self.store.write().await;
        w.insert(key.into(), value);
    }
    pub async fn get(&self, key: &str) -> Option<Vec<u8>> {
        let r = self.store.read().await;
        r.get(key).cloned()
    }
    pub async fn remove(&mut self, key: &str) {
        let mut r = self.store.write().await;
        r.remove(key);
    }
}
