use axum::Router;
use dotenv::dotenv;
use esfwee::{AppState, api, db};
use sqlx::{Pool, Sqlite};
use std::env;
use std::path::PathBuf;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let kv_dir = PathBuf::from(env::var("KV_DIR").expect("KV_DIR not set"));
    let image_dir = PathBuf::from(env::var("IMAGE_DIR").unwrap_or_else(|_| "data/images".into()));

    let state = AppState::new(kv_dir, image_dir);
    let pool = db::connect_db().await;

    // Todo:
    // GET /manga
    // POST /manga
    // GET /manga/:id
    // DELETE /manga/:id
    // PUT /manga/:id // Metadata
    // GET    /manga/:id/chapters       # List chapters
    // GET    /chapters/:id             # Chapter details
    // GET    /chapters/:id/pages/:num  # Stream page image
    // POST   /chapters/:id/process     # Extract uploaded archive
    // GET    /progress                 # All reading progress
    // POST   /progress                 # Update progress
    // GET    /progress/:manga_id       # Progress for specific manga
    // POST   /sync/anilist             # Trigger full sync
    // GET    /sync/status              # Sync status
    // POST   /sync/manga/:id           # Sync specific manga
    //
    //
    let app = get_router(state, pool);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();

    println!("Server running on http://0.0.0.0:3000");
    axum::serve(listener, app).await.unwrap();
}

fn get_router(state: AppState, pool: Pool<Sqlite>) -> Router {
    api::router(state, pool)
}
