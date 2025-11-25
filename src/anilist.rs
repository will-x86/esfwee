use rust_anilist::Client;

pub async fn fetch_manga_metadata(
    anilist_id: i64,
) -> anyhow::Result<(String, Option<String>, String)> {
    let client = Client::with_token("");
    let manga = client.get_manga(anilist_id).await?;
    let mut title = manga.title.english();
    if title.is_empty() {
        title = manga.title.romaji();
        if title.is_empty() {
            title = "No title found"
        }
    }
    let author = manga.staff.and_then(|staff| {
        staff
            .iter()
            .find(|edge| {
                let d = edge.description.as_deref().unwrap_or_default();
                d.contains("Story") || d.contains("Original Creator")
            })
            .map(|edge| edge.name.full().clone())
    });
    return Ok((title.to_string(), author, manga.description));
}
