use axum::Router;
use dotenv::dotenv;
use esfwee::{AppState, api};
use std::env;
use std::path::PathBuf;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let kv_dir = PathBuf::from(env::var("KV_DIR").expect("KV_DIR not set"));
    let image_dir = PathBuf::from(env::var("IMAGE_DIR").unwrap_or_else(|_| "data/images".into()));

    let state = AppState::new(kv_dir, image_dir);
    let app = get_router(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    println!("Server running on http://0.0.0.0:3000");
    axum::serve(listener, app).await.unwrap();
}

fn get_router(state: AppState) -> Router {
    api::router(state)
}
