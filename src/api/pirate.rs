use crate::api::manga::AppError;
use crate::arrrrr::{
    Chapter, MangaResult, get_manga_pill_chapters, get_manga_pill_pages, search_manga_pill,
};
use crate::{AppState, anilist};
use axum::extract::{Query, State};
use axum::routing::{get, post};
use axum::{Extension, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Sqlite};
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/search", get(search_manga))
        .route("/chapters", get(get_chapters))
        .route("/download", post(download_chapter))
}

#[derive(Deserialize)]
pub struct SearchRequest {
    pub query: String,
}

#[derive(Deserialize)]
pub struct ChaptersRequest {
    pub manga_url: String,
}

#[derive(Deserialize)]
pub struct DownloadRequest {
    pub anilist_id: i64,
    pub chapter_url: String,
    pub chapter_number: f64,
    pub chapter_title: Option<String>,
}

#[derive(Serialize)]
pub struct DownloadResponse {
    pub success: bool,
    pub message: String,
    pub pages_downloaded: usize,
}

#[axum::debug_handler]
pub async fn search_manga(
    Query(query): Query<SearchRequest>,
) -> Result<Json<Vec<MangaResult>>, AppError> {
    let manga = search_manga_pill(&query.query).await?;
    Ok(Json(manga))
}

#[axum::debug_handler]
pub async fn get_chapters(
    Query(query): Query<ChaptersRequest>,
) -> Result<Json<Vec<Chapter>>, AppError> {
    let chapters = get_manga_pill_chapters(&query.manga_url).await?;
    Ok(Json(chapters))
}

#[axum::debug_handler]
pub async fn download_chapter(
    State(state): State<AppState>,
    Extension(pool): Extension<Pool<Sqlite>>,
    Json(req): Json<DownloadRequest>,
) -> Result<Json<DownloadResponse>, AppError> {
    // Get pages from scraper
    let pages = get_manga_pill_pages(&req.chapter_url).await?;

    if pages.is_empty() {
        return Ok(Json(DownloadResponse {
            success: false,
            message: "No pages found".to_string(),
            pages_downloaded: 0,
        }));
    }

    // Setup storage paths
    let chapter_storage_path = format!(
        "data/manga/{}/chapter_{}",
        req.anilist_id, req.chapter_number
    );
    let mut full_chapter_path = state.image_dir.clone();
    full_chapter_path.push(&chapter_storage_path);
    fs::create_dir_all(&full_chapter_path).await?;

    // Download pages
    let client = reqwest::Client::builder()
        .default_headers({
            let mut headers = reqwest::header::HeaderMap::new();
            headers.insert("Referer", "https://mangapill.com/".parse()?);
            headers.insert(
                "User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36".parse()?,
            );
            headers
        })
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let mut downloaded = 0;
    for (idx, page) in pages.iter().enumerate() {
        let ext = page.url.split('.').last().unwrap_or("jpg");
        let filename = format!("{:03}.{}", idx + 1, ext);
        let mut file_path = full_chapter_path.clone();
        file_path.push(&filename);

        let response = client.get(&page.url).send().await?;
        let bytes = response.bytes().await?;

        let mut file = File::create(file_path).await?;
        file.write_all(&bytes).await?;
        downloaded += 1;
    }
    let (title, author, description) =
        anilist::fetch_manga_metadata(req.anilist_id.clone()).await?;
    let manga_storage_path = format!("data/manga/{}", req.anilist_id);
    let page_count = downloaded as i64;

    sqlx::query!(
        r#"
        INSERT INTO manga (anilist_id, title, author,description, storage_path)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(anilist_id) DO UPDATE SET
            updated_at = CURRENT_TIMESTAMP
        "#,
        req.anilist_id,
        title,
        author,
        description,
        manga_storage_path,
    )
    .execute(&pool)
    .await?;

    sqlx::query!(
        r#"
        INSERT INTO chapters (anilist_id, chapter_number, title, page_count, storage_path)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(anilist_id, chapter_number) DO UPDATE SET
            title = excluded.title,
            page_count = excluded.page_count,
            storage_path = excluded.storage_path
        "#,
        req.anilist_id,
        req.chapter_number,
        req.chapter_title,
        page_count,
        chapter_storage_path
    )
    .execute(&pool)
    .await?;

    Ok(Json(DownloadResponse {
        success: true,
        message: format!("Downloaded chapter {} successfully", req.chapter_number),
        pages_downloaded: downloaded,
    }))
}
