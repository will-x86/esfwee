pub mod manga;
pub mod pirate;
pub mod s3;

use crate::AppState;
use axum::{Extension, Router};
use sqlx::{Pool, Sqlite};

pub fn router(state: AppState, pool: Pool<Sqlite>) -> Router {
    Router::new()
        .nest("/bucket", s3::router()) // Delete later lmfao
        .nest("/manga", manga::router())
        .nest("/pirate", pirate::router())
        .with_state(state)
        .layer(Extension(pool))
}
