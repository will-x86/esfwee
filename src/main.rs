use std::path::PathBuf;

use crate::handlers::{delete_obj, get_bucket, get_obj, new_bucket, put_obj};
use crate::kv::KVStore;
use axum::routing::post;
use axum::{
    Router,
    routing::{delete, get, put},
};
use dotenv::dotenv;
mod handlers;
mod kv;

#[derive(Clone)]
struct AppState {
    kv_store: KVStore,
}
#[tokio::main]
async fn main() {
    dotenv().ok();
    let app = get_router();
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
fn get_router() -> axum::Router {
    let state = AppState {
        kv_store: KVStore::new(PathBuf::from(env::var("KV_DIR").expect("no kv dir set"))),
    };
    Router::new()
        .route("/bucket/{bucket}/objects/{key}", put(put_obj))
        .route("/bucket/{bucket}/objects/{key}", get(get_obj))
        .route("/bucket/{bucket}/objects/{key}", delete(delete_obj))
        .route("/bucket/{bucket}", get(get_bucket))
        .route("/bucket/{bucket}", post(new_bucket))
        .with_state(state)
}
