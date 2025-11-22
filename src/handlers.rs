use bincode::{Decode, Encode, config::standard, decode_from_slice};
use serde::Serialize;
use serde_json::json;
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

#[derive(Debug, Encode, Decode, Serialize)]
struct Metadata {
    created_at: String,
    tags: Vec<String>,
    hash: String,
    content_type: String,
}
#[axum::debug_handler]
pub async fn put_obj(
    State(state): State<AppState>,
    Path((bucket, key)): Path<(String, String)>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<String, AppError> {
    if state.kv_store.get(bucket.as_bytes()).await.is_none() {
        return Err(anyhow::anyhow!("bucket {bucket} does not exist"))?;
    }
    let hash = headers
        .get("x-hash")
        .ok_or_else(|| anyhow::anyhow!("hash is not present"))?
        .to_str()?;
    let content_type = headers
        .get("Content-Type")
        .ok_or_else(|| anyhow::anyhow!("content-type is not present"))?
        .to_str()?
        .to_string();
    let c2_hash = hash
        .as_bytes()
        .first_chunk::<2>()
        .ok_or_else(|| anyhow::anyhow!("hash does not have first 2 chars"))?;
    let custom_tags: Vec<String> = headers
        .iter()
        .filter(|(k, _)| k.as_str().starts_with("x-kv-"))
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
        content_type,
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
    State(state): State<AppState>,
    Path((bucket, key)): Path<(String, String)>,
) -> Result<impl IntoResponse, AppError> {
    let raw = state
        .kv_store
        .get(&format!("{bucket}/{key}").as_bytes())
        .await
        .ok_or_else(|| anyhow!("object does not exist"))?;

    let (metadata, _len): (Metadata, _) = decode_from_slice(&raw, standard())?;

    let c2_hash = metadata
        .hash
        .as_bytes()
        .first_chunk::<2>()
        .ok_or_else(|| anyhow!("invalid hash format"))?;

    let data_dir = std::env::var("DATA_DIR")?;
    let mut p = PathBuf::from(data_dir);
    p.push("data");
    p.push(std::str::from_utf8(c2_hash)?);
    p.push(&key);

    // stweam from disk
    let file = File::open(&p).await?;
    let stream = tokio_util::io::ReaderStream::new(file);
    let body = axum::body::Body::from_stream(stream);

    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", metadata.content_type.parse()?);
    headers.insert("x-hash", format!("\"{}\"", metadata.hash).parse()?);
    headers.insert("ETag", format!("\"{}\"", metadata.hash).parse()?);
    headers.insert(
        "Cache-Control",
        "public, max-age=31536000, immutable".parse()?,
    );

    Ok((headers, body))
}
pub async fn delete_obj(
    State(state): State<AppState>,
    Path((bucket, key)): Path<(String, String)>,
) -> Result<String, AppError> {
    let raw = state
        .kv_store
        .get(&format!("{bucket}/{key}").as_bytes())
        .await
        .ok_or_else(|| anyhow!("object does not exist"))?;

    let (metadata, _len): (Metadata, _) = decode_from_slice(&raw, standard())?;
    let data_dir = std::env::var("DATA_DIR")?;

    let c2_hash = metadata
        .hash
        .as_bytes()
        .first_chunk::<2>()
        .ok_or_else(|| anyhow!("invalid hash format"))?;

    let mut p = PathBuf::from(data_dir);
    p.push("data");
    p.push(std::str::from_utf8(c2_hash)?);
    p.push(&key);
    fs::remove_file(p.clone()).await?;
    p.pop();
    let _ = fs::remove_dir(p).await; // Ignore result error-will fail if dir is not empty, should be ok
    state
        .kv_store
        .remove(&format!("{bucket}/{key}").as_bytes())
        .await;
    Ok(json!({"message":"deleted successfully"}).to_string())
}

#[derive(Serialize, Encode, Decode)]
struct MetadataBucket {
    created_at: String,
    tags: Vec<String>,
}
pub async fn new_bucket(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(bucket): Path<String>,
) -> Result<String, AppError> {
    if state.kv_store.get(&bucket.as_bytes()).await.is_some() {
        return Err(anyhow!("bucket already exists").into());
    };

    let tags: Vec<String> = headers
        .iter()
        .filter(|(k, _)| k.as_str().starts_with("x-kv-"))
        .filter_map(|(_, v)| v.to_str().ok())
        .map(String::from)
        .collect();
    let metadata = MetadataBucket {
        created_at: Utc::now().to_rfc3339(),
        tags,
    };
    state
        .kv_store
        .put(
            format!("{bucket}"),
            bincode::encode_to_vec(&metadata, bincode::config::standard())?,
        )
        .await;
    Ok(serde_json::to_string(&metadata)?)
}
pub async fn get_bucket(
    State(state): State<AppState>,
    Path(bucket): Path<String>,
) -> Result<String, AppError> {
    let raw = state
        .kv_store
        .get(&bucket.as_bytes())
        .await
        .ok_or_else(|| anyhow!("no bucket exists"))?;

    let (metadata, _len): (MetadataBucket, _) = decode_from_slice(&raw, standard())?;

    Ok(serde_json::to_string(&metadata)?)
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
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_put_obj_success() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };
                state.kv_store.put("test-bucket", vec![]).await;
                let test_data = b"hello world";
                let hash = hex::encode(Sha256::digest(test_data));
                let mut headers = HeaderMap::new();
                headers.insert("x-hash", hash.parse().unwrap());
                headers.insert("Content-Type", "text/plain".parse().unwrap());
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
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_put_obj_bucket_not_exists() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };

                let test_data = b"hello world";
                let hash = hex::encode(Sha256::digest(test_data));

                let mut headers = HeaderMap::new();
                headers.insert("x-hash", hash.parse().unwrap());
                headers.insert("Content-Type", "text/plain".parse().unwrap());

                let result = put_obj(
                    State(state),
                    Path(("nonexistent".to_string(), "test-key".to_string())),
                    headers,
                    Bytes::from_static(test_data),
                )
                .await;

                assert!(result.is_err());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_put_obj_hash_mismatch() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };
                state.kv_store.put("test-bucket", vec![]).await;

                let test_data = b"hello world";

                let mut headers = HeaderMap::new();
                headers.insert("x-hash", "badhash1234567890".parse().unwrap());
                headers.insert("Content-Type", "text/plain".parse().unwrap());

                let result = put_obj(
                    State(state),
                    Path(("test-bucket".to_string(), "test-key".to_string())),
                    headers,
                    Bytes::from_static(test_data),
                )
                .await;

                assert!(result.is_err());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_put_obj_missing_hash_header() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };
                state.kv_store.put("test-bucket", vec![]).await;

                let mut headers = HeaderMap::new();
                headers.insert("Content-Type", "text/plain".parse().unwrap());

                let result = put_obj(
                    State(state),
                    Path(("test-bucket".to_string(), "test-key".to_string())),
                    headers,
                    Bytes::from_static(b"test"),
                )
                .await;

                assert!(result.is_err());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_put_obj_missing_content_type() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };
                state.kv_store.put("test-bucket", vec![]).await;

                let test_data = b"hello world";
                let hash = hex::encode(Sha256::digest(test_data));

                let mut headers = HeaderMap::new();
                headers.insert("x-hash", hash.parse().unwrap());

                let result = put_obj(
                    State(state),
                    Path(("test-bucket".to_string(), "test-key".to_string())),
                    headers,
                    Bytes::from_static(test_data),
                )
                .await;

                assert!(result.is_err());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_get_obj_success() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };

                state.kv_store.put("test-bucket", vec![]).await;

                let test_data = b"hello world";
                let hash = hex::encode(Sha256::digest(test_data));

                let mut headers = HeaderMap::new();
                headers.insert("x-hash", hash.parse().unwrap());
                headers.insert("Content-Type", "text/plain".parse().unwrap());

                let _ = put_obj(
                    State(state.clone()),
                    Path(("test-bucket".to_string(), "test-key".to_string())),
                    headers,
                    Bytes::from_static(test_data),
                )
                .await
                .unwrap();

                let result = get_obj(
                    State(state),
                    Path(("test-bucket".to_string(), "test-key".to_string())),
                )
                .await;

                assert!(result.is_ok());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_get_obj_not_exists() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };

                let result = get_obj(
                    State(state),
                    Path(("test-bucket".to_string(), "nonexistent".to_string())),
                )
                .await;

                assert!(result.is_err());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_delete_obj_success() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };

                state.kv_store.put("test-bucket", vec![]).await;

                let test_data = b"hello world";
                let hash = hex::encode(Sha256::digest(test_data));

                let mut headers = HeaderMap::new();
                headers.insert("x-hash", hash.parse().unwrap());
                headers.insert("Content-Type", "text/plain".parse().unwrap());

                let _ = put_obj(
                    State(state.clone()),
                    Path(("test-bucket".to_string(), "test-key".to_string())),
                    headers,
                    Bytes::from_static(test_data),
                )
                .await
                .unwrap();

                let result = delete_obj(
                    State(state),
                    Path(("test-bucket".to_string(), "test-key".to_string())),
                )
                .await;

                assert!(result.is_ok());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_delete_obj_not_exists() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };

                let result = delete_obj(
                    State(state),
                    Path(("test-bucket".to_string(), "nonexistent".to_string())),
                )
                .await;

                assert!(result.is_err());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_new_bucket_success() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };

                let mut headers = HeaderMap::new();
                headers.insert("x-kv-region", "us-west".parse().unwrap());
                headers.insert("x-kv-env", "prod".parse().unwrap());

                let result =
                    new_bucket(State(state), headers, Path("new-bucket".to_string())).await;

                assert!(result.is_ok());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_new_bucket_already_exists() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };

                state.kv_store.put("existing-bucket", vec![]).await;

                let headers = HeaderMap::new();

                let result =
                    new_bucket(State(state), headers, Path("existing-bucket".to_string())).await;

                assert!(result.is_err());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_get_bucket_success() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };

                let headers = HeaderMap::new();
                let _ = new_bucket(
                    State(state.clone()),
                    headers,
                    Path("test-bucket".to_string()),
                )
                .await;

                let result = get_bucket(State(state), Path("test-bucket".to_string())).await;

                assert!(result.is_ok());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_get_bucket_not_exists() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };

                let result = get_bucket(State(state), Path("nonexistent".to_string())).await;

                assert!(result.is_err());
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_put_obj_with_multiple_tags() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };

                state.kv_store.put("test-bucket", vec![]).await;

                let test_data = b"tagged data";
                let hash = hex::encode(Sha256::digest(test_data));

                let mut headers = HeaderMap::new();
                headers.insert("x-hash", hash.parse().unwrap());
                headers.insert("Content-Type", "application/json".parse().unwrap());
                headers.insert("x-kv-tag1", "value1".parse().unwrap());
                headers.insert("x-kv-tag2", "value2".parse().unwrap());
                headers.insert("x-kv-tag3", "value3".parse().unwrap());

                let result = put_obj(
                    State(state),
                    Path(("test-bucket".to_string(), "tagged-key".to_string())),
                    headers,
                    Bytes::from_static(test_data),
                )
                .await;

                assert!(result.is_ok());
                let metadata_json = result.unwrap();
                assert!(metadata_json.contains("value1"));
                assert!(metadata_json.contains("value2"));
                assert!(metadata_json.contains("value3"));
            },
        )
        .await;
    }

    #[tokio::test]
    async fn test_put_obj_empty_body() {
        let kv_dir = TempDir::new().unwrap();
        let data_dir = TempDir::new().unwrap();

        temp_env::async_with_vars(
            [("DATA_DIR", Some(data_dir.path().to_str().unwrap()))],
            async {
                let state = AppState {
                    kv_store: KVStore::new(kv_dir.path().to_path_buf()),
                };

                state.kv_store.put("test-bucket", vec![]).await;

                let test_data = b"";
                let hash = hex::encode(Sha256::digest(test_data));

                let mut headers = HeaderMap::new();
                headers.insert("x-hash", hash.parse().unwrap());
                headers.insert("Content-Type", "text/plain".parse().unwrap());

                let result = put_obj(
                    State(state),
                    Path(("test-bucket".to_string(), "empty-key".to_string())),
                    headers,
                    Bytes::from_static(test_data),
                )
                .await;

                assert!(result.is_ok());
            },
        )
        .await;
    }
}
