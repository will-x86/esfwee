pub mod s3;

use crate::AppState;
use axum::Router;

pub fn router(state: AppState) -> Router {
    Router::new()
        .nest("/bucket", s3::router())
        .with_state(state)
}
