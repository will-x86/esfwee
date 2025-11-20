use crate::handlers::{delete_obj, get_bucket, get_obj, put_obj};
use crate::kv::KVStore;
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
        kv_store: KVStore::new(),
    };
    Router::new()
        .route("/", get(handlers::hello))
        // Send metadata
        .route("/bucket/{bucket}/objects/{key}", put(put_obj))
        .route("/bucket/{bucket}/objects/{key}", get(get_obj))
        .route("/bucket/{bucket}/objects/{key}", delete(delete_obj))
        .route("/bucket/{bucket}", get(get_bucket))
        .with_state(state)
}
#[cfg(test)]
mod tests {
    use axum::body::Bytes;
    use axum_test::TestServer;

    use crate::get_router;
    #[tokio::test]
    async fn bucket_not_exist() {
        let app = get_router();
        let server = TestServer::new(app).unwrap();
        let response = server
            .put("/bucket/not_exist/objects/na")
            .bytes(Bytes::from_static(b"lmfao"))
            .await;
        assert!(response.status_code() == 500);
    }
}
