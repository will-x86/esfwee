use anyhow::anyhow;
use axum::{
    Extension, Json, Router,
    extract::{DefaultBodyLimit, Multipart, Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{delete, get, post},
};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Sqlite, prelude::FromRow};
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;

use crate::{anilist, AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(upload_manga))
        .layer(DefaultBodyLimit::max(100 * 1024 * 1024))
        .route("/", get(list_manga))
        .route("/{anilist_id}", get(get_manga))
        .route("/{anilist_id}", delete(delete_manga))
        .route("/{anilist_id}/chapters", get(list_chapters))
        .route("/chapters/{chapter_id}/pages/{page_num}", get(get_page))
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Manga {
    pub anilist_id: i64,
    pub title: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub storage_path: String,
    pub added_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Chapter {
    pub id: i64,
    pub anilist_id: i64,
    pub chapter_number: f64,
    pub title: Option<String>,
    pub page_count: i64,
    pub storage_path: String,
    pub added_at: String,
}

#[derive(Debug, Deserialize, FromRow)]
pub struct UpdateMangaRequest {
    pub title: Option<String>,
    pub author: Option<String>,
    pub description: Option<String>,
}

// POST /manga - Upload CBZ with metadata
#[axum::debug_handler]
pub async fn upload_manga(
    State(state): State<AppState>,
    Extension(pool): Extension<Pool<Sqlite>>,
    mut multipart: Multipart,
) -> Result<Json<Manga>, AppError> {
    let mut anilist_id: Option<i64> = None;
    let mut chapter_number: Option<f64> = None;
    let mut cbz_data: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await? {
        let name = field.name().unwrap_or("").to_string();

        match name.as_str() {
            "anilist_id" => {
                let text = field.text().await?;
                anilist_id = Some(text.parse()?);
            }
            "chapter_number" => {
                let text = field.text().await?;
                chapter_number = Some(text.parse()?);
            }
            "file" => {
                cbz_data = Some(field.bytes().await?.to_vec());
            }
            _ => {
                println!("Unknown field: {}", name);
            }
        }
    }

    let anilist_id = anilist_id.ok_or_else(|| anyhow!("anilist_id is required"))?;
    let chapter_number = chapter_number.ok_or_else(|| anyhow!("chapter_number is required"))?;
    let cbz_data = cbz_data.ok_or_else(|| anyhow!("file is required"))?;

    let (title, author, description) = anilist::fetch_manga_metadata(anilist_id).await?;

    let manga_storage_path = format!("data/manga/{}", anilist_id);
    let chapter_storage_path = format!("{}/chapter_{}", manga_storage_path, chapter_number);

    let mut full_chapter_path = state.image_dir.clone();
    full_chapter_path.push(&chapter_storage_path);
    fs::create_dir_all(&full_chapter_path).await?;

    // Extract CBZ
    let cursor = std::io::Cursor::new(cbz_data);
    let mut archive = zip::ZipArchive::new(cursor)?;

    let mut page_count = 0;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let filename = file.name().to_string();

        // Skip directories and non-image files
        if file.is_dir() || !is_image_file(&filename) {
            continue;
        }

        let mut output_path = full_chapter_path.clone();
        output_path.push(&filename);

        let mut output_file = File::create(output_path).await?;
        let mut buffer = Vec::new();
        std::io::Read::read_to_end(&mut file, &mut buffer)?;
        output_file.write_all(&buffer).await?;

        page_count += 1;
    }

    if page_count == 0 {
        return Err(anyhow!("No image files found in CBZ").into());
    }

    let manga = sqlx::query_as!(
        Manga,
        r#"
        INSERT INTO manga (anilist_id, title, author, description, storage_path)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(anilist_id) DO UPDATE SET
            title = COALESCE(excluded.title, manga.title),
            author = COALESCE(excluded.author, manga.author),
            description = COALESCE(excluded.description, manga.description),
            updated_at = CURRENT_TIMESTAMP
        RETURNING anilist_id, title, author as "author?", description as "description?",
                   storage_path,
                  added_at as "added_at: String", updated_at as "updated_at: String"
        "#,
        anilist_id,
        title,
        author,
        description,
        manga_storage_path
    )
    .fetch_one(&pool)
    .await?;

    sqlx::query!(
        r#"
        INSERT INTO chapters (anilist_id, chapter_number, page_count, storage_path)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(anilist_id, chapter_number) DO UPDATE SET
            page_count = excluded.page_count,
            storage_path = excluded.storage_path
        "#,
        anilist_id,
        chapter_number,
        page_count,
        chapter_storage_path
    )
    .execute(&pool)
    .await?;

    Ok(Json(manga))
}

// GET /manga - List all manga
pub async fn list_manga(
    Extension(pool): Extension<Pool<Sqlite>>,
) -> Result<Json<Vec<Manga>>, AppError> {
    let manga = sqlx::query_as!(
        Manga,
        r#"
        SELECT anilist_id, title, author as "author?", description as "description?",
                storage_path,
               added_at as "added_at: String", updated_at as "updated_at: String"
        FROM manga
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(manga))
}

// GET /manga/:anilist_id
pub async fn get_manga(
    Extension(pool): Extension<Pool<Sqlite>>,
    Path(anilist_id): Path<i64>,
) -> Result<Json<Manga>, AppError> {
    let manga = sqlx::query_as!(
        Manga,
        r#"
        SELECT anilist_id, title, author as "author?", description as "description?",
               storage_path,
               added_at as "added_at: String", updated_at as "updated_at: String"
        FROM manga
        WHERE anilist_id = ?
        "#,
        anilist_id
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| anyhow!("Manga not found"))?;

    Ok(Json(manga))
}

// DELETE /manga/:anilist_id
pub async fn delete_manga(
    State(state): State<AppState>,
    Extension(pool): Extension<Pool<Sqlite>>,
    Path(anilist_id): Path<i64>,
) -> Result<StatusCode, AppError> {
    // Get manga to find storage path
    let manga = sqlx::query!(
        "SELECT storage_path FROM manga WHERE anilist_id = ?",
        anilist_id
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| anyhow!("Manga not found"))?;

    sqlx::query!("DELETE FROM manga WHERE anilist_id = ?", anilist_id)
        .execute(&pool)
        .await?;

    let mut storage_path = state.image_dir.clone();
    storage_path.push(&manga.storage_path);
    if storage_path.exists() {
        fs::remove_dir_all(storage_path).await?;
    }

    Ok(StatusCode::NO_CONTENT)
}

// GET /manga/:anilist_id/chapters
pub async fn list_chapters(
    Extension(pool): Extension<Pool<Sqlite>>,
    Path(anilist_id): Path<i64>,
) -> Result<Json<Vec<Chapter>>, AppError> {
    let chapters = sqlx::query_as!(
        Chapter,
        r#"
        SELECT id as "id!", anilist_id, chapter_number, title as "title?", page_count, storage_path,
               added_at as "added_at: String"
        FROM chapters
        WHERE anilist_id = ?
        ORDER BY chapter_number ASC
        "#,
        anilist_id
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(chapters))
}

// GET /chapters/:chapter_id/pages/:page_num
pub async fn get_page(
    State(state): State<AppState>,
    Extension(pool): Extension<Pool<Sqlite>>,
    Path((chapter_id, page_num)): Path<(i64, usize)>,
) -> Result<impl IntoResponse, AppError> {
    let chapter = sqlx::query!("SELECT storage_path FROM chapters WHERE id = ?", chapter_id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| anyhow!("Chapter not found"))?;

    let mut chapter_path = state.image_dir.clone();
    chapter_path.push(&chapter.storage_path);

    let mut entries = fs::read_dir(&chapter_path).await?;
    let mut image_files = Vec::new();

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        if path.is_file() {
            if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                if is_image_file(filename) {
                    image_files.push(path);
                }
            }
        }
    }

    // Sort files naturally
    image_files.sort();

    if page_num == 0 || page_num > image_files.len() {
        return Err(anyhow!("Page number out of range").into());
    }

    let page_path = &image_files[page_num - 1];

    // Stream the image file
    let file = File::open(page_path).await?;
    let stream = tokio_util::io::ReaderStream::new(file);
    let body = axum::body::Body::from_stream(stream);

    // Determine content type from extension
    let content_type = match page_path.extension().and_then(|e| e.to_str()) {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        _ => "application/octet-stream",
    };

    Ok(([(axum::http::header::CONTENT_TYPE, content_type)], body))
}

fn is_image_file(filename: &str) -> bool {
    let lower = filename.to_lowercase();
    lower.ends_with(".jpg")
        || lower.ends_with(".jpeg")
        || lower.ends_with(".png")
        || lower.ends_with(".gif")
        || lower.ends_with(".webp")
}

#[derive(Debug)]
pub struct AppError(anyhow::Error);

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
            format!("Error: {}", self.0),
        )
            .into_response()
    }
}
