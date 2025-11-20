use bincode::Encode;
use serde::Serialize;
use std::path::PathBuf;
use tokio::{
    fs::{self, File},
    io::AsyncWriteExt,
};

use crate::AppState;
use anyhow::anyhow;
use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
};
use chrono::Utc;
use sha2::{Digest, Sha256};
use uuid::Uuid;

#[derive(Debug, Encode, Serialize)]
struct Metadata {
    created_at: String,
    tags: Vec<String>,
    hash: String,
}
#[axum::debug_handler]
pub async fn put_obj(
    State(mut state): State<AppState>,
    Path((bucket, key)): Path<(String, String)>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<String, AppError> {
    if state.kv_store.get(&bucket).await.is_none() {
        return Err(anyhow::anyhow!("bucket {bucket} does not exist"))?;
    }
    let hash = headers
        .get("x-hash")
        .ok_or_else(|| anyhow::anyhow!("hash is not present"))?
        .to_str()?;
    let c2_hash = hash
        .as_bytes()
        .first_chunk::<2>()
        .ok_or_else(|| anyhow::anyhow!("hash does not have first 2 chars"))?;
    let custom_tags: Vec<String> = headers
        .iter()
        .filter(|(k, _)| k.as_str().starts_with("x‑kv-"))
        .filter_map(|(_, v)| v.to_str().ok())
        .map(String::from)
        .collect();
    let body_hash = hex::encode(Sha256::digest(&body));
    if body_hash != hash {
        return Err(anyhow!("hashes do not match").into());
    }
    let metadata = Metadata {
        created_at: Utc::now().to_rfc3339(),
        hash: body_hash,
        tags: custom_tags,
    };
    let data_dir = env::var("DATA_DIR")?;
    let mut p = PathBuf::from(data_dir);
    p.push("data");
    p.push(str::from_utf8(c2_hash)?);
    p.push(&key);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).await?;
    }
    let mut f = File::create(&p).await?;
    f.write(&body).await?;
    f.flush().await?;
    state
        .kv_store
        .put(
            format!("{bucket}/{key}"),
            bincode::encode_to_vec(&metadata, bincode::config::standard())?,
        )
        .await;
    Ok(serde_json::to_string(&metadata)?)
}
pub async fn get_obj(
    State(mut _state): State<AppState>,
    Path((bucket, key)): Path<(String, String)>,
) -> String {
    format!("get Bucket:{bucket} - key: {key})")
}

pub async fn delete_obj(
    State(mut _state): State<AppState>,
    Path((bucket, key)): Path<(String, String)>,
) -> String {
    format!("del Bucket:{bucket} - key: {key})")
}

pub async fn get_bucket(State(mut _state): State<AppState>, Path(bucket): Path<Uuid>) -> String {
    format!("get bucket - Bucket:{bucket} ")
}

impl<E> From<E> for AppError
where
    E: Into<anyhow::Error>,
{
    fn from(err: E) -> Self {
        Self(err.into())
    }
}
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Something went wrong: {}", self.0),
        )
            .into_response()
    }
}
#[derive(Debug)]
pub struct AppError(anyhow::Error);
#[cfg(test)]
mod tests {
    use super::*;
    use crate::kv::KVStore;
    use sha2::{Digest, Sha256};

    #[tokio::test]
    async fn test_put_obj_success() {
        unsafe {
            std::env::set_var("DATA_DIR", "/tmp/test_data");
        }

        let mut state = AppState {
            kv_store: KVStore::new(),
        };

        // Create the bucket first
        state.kv_store.put("test-bucket", vec![]).await;

        let test_data = b"hello world";
        let hash = hex::encode(Sha256::digest(test_data));

        let mut headers = HeaderMap::new();
        headers.insert("x-hash", hash.parse().unwrap());
        headers.insert("x-kv-tag1", "value1".parse().unwrap());
        headers.insert("x-kv-tag2", "value2".parse().unwrap());

        let result = put_obj(
            State(state),
            Path(("test-bucket".to_string(), "test-key".to_string())),
            headers,
            Bytes::from_static(test_data),
        )
        .await;

        assert!(result.is_ok());
        let metadata_json = result.unwrap();
        assert!(metadata_json.contains(&hash));
    }

    #[tokio::test]
    async fn test_put_obj_bucket_not_exists() {
        let state = AppState {
            kv_store: KVStore::new(),
        };

        let test_data = b"hello world";
        let hash = hex::encode(Sha256::digest(test_data));

        let mut headers = HeaderMap::new();
        headers.insert("x-hash", hash.parse().unwrap());

        let result = put_obj(
            State(state),
            Path(("nonexistent".to_string(), "test-key".to_string())),
            headers,
            Bytes::from_static(test_data),
        )
        .await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_put_obj_hash_mismatch() {
        unsafe {
            std::env::set_var("DATA_DIR", "/tmp/test_data");
        }

        let mut state = AppState {
            kv_store: KVStore::new(),
        };
        state.kv_store.put("test-bucket", vec![]).await;

        let test_data = b"hello world";

        let mut headers = HeaderMap::new();
        headers.insert("x-hash", "badhash1234567890".parse().unwrap());

        let result = put_obj(
            State(state),
            Path(("test-bucket".to_string(), "test-key".to_string())),
            headers,
            Bytes::from_static(test_data),
        )
        .await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_put_obj_missing_hash_header() {
        let mut state = AppState {
            kv_store: KVStore::new(),
        };
        state.kv_store.put("test-bucket", vec![]).await;

        let headers = HeaderMap::new();

        let result = put_obj(
            State(state),
            Path(("test-bucket".to_string(), "test-key".to_string())),
            headers,
            Bytes::from_static(b"test"),
        )
        .await;

        assert!(result.is_err());
    }
}
