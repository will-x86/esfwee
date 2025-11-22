use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct KVStore {
    db: Arc<RwLock<sled::Db>>,
}

impl KVStore {
    pub fn new(path: PathBuf) -> Self {
        let db = sled::open(path).expect("failed to open sled DB");
        Self {
            db: Arc::new(RwLock::new(db)),
        }
    }

    pub async fn put(&self, key: impl Into<Vec<u8>>, value: Vec<u8>) {
        let db = self.db.read().await;
        db.insert(key.into(), value).unwrap();
    }

    pub async fn get(&self, key: &[u8]) -> Option<Vec<u8>> {
        let db = self.db.read().await;
        db.get(key).ok().flatten().map(|v| v.to_vec())
    }

    pub async fn remove(&self, key: &[u8]) {
        let db = self.db.read().await;
        db.remove(key).unwrap();
    }
}
