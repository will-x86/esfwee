use sqlx::{Pool, Sqlite, migrate::MigrateDatabase, sqlite::SqlitePoolOptions};
use std::{env, path::Path};

pub async fn connect_db() -> Pool<Sqlite> {
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    if let Some(path_str) = db_url
        .strip_prefix("sqlite://")
        .or_else(|| db_url.strip_prefix("sqlite:"))
    {
        if let Some(parent) = Path::new(path_str).parent() {
            std::fs::create_dir_all(parent).expect("Failed to create database directory");
        }
    }

    if !Sqlite::database_exists(&db_url).await.unwrap_or(false) {
        Sqlite::create_database(&db_url)
            .await
            .expect("Failed to create database");
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("Failed to create pool.");

    pool
}
