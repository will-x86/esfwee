use anyhow::anyhow;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
struct AniListQuery {
    query: String,
    variables: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct AniListResponse {
    data: AniListData,
}

#[derive(Debug, Deserialize)]
struct AniListData {
    #[serde(rename = "Media")]
    media: AniListMedia,
}

#[derive(Debug, Deserialize)]
struct AniListMedia {
    title: AniListTitle,
    description: Option<String>,
    staff: Option<AniListStaff>,
}

#[derive(Debug, Deserialize)]
struct AniListTitle {
    romaji: Option<String>,
    english: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AniListStaff {
    edges: Vec<AniListStaffEdge>,
}

#[derive(Debug, Deserialize)]
struct AniListStaffEdge {
    role: String,
    node: AniListStaffNode,
}

#[derive(Debug, Deserialize)]
struct AniListStaffNode {
    name: AniListName,
}

#[derive(Debug, Deserialize)]
struct AniListName {
    full: String,
}

pub async fn fetch_manga_metadata(
    anilist_id: i64,
) -> anyhow::Result<(String, Option<String>, Option<String>)> {
    let query = r#"
        query ($id: Int) {
            Media(id: $id, type: MANGA) {
                title {
                    romaji
                    english
                }
                description(asHtml: false)
                staff(perPage: 25) {
                    edges {
                        role
                        node {
                            name {
                                full
                            }
                        }
                    }
                }
            }
        }
    "#;

    let variables = serde_json::json!({
        "id": anilist_id
    });

    let client = reqwest::Client::new();
    let response = client
        .post("https://graphql.anilist.co")
        .json(&AniListQuery {
            query: query.to_string(),
            variables,
        })
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(anyhow!("AniList API returned error: {}", response.status()));
    }

    let anilist_response: AniListResponse = response.json().await?;
    let media = anilist_response.data.media;

    let title = media
        .title
        .english
        .or(media.title.romaji)
        .ok_or_else(|| anyhow!("No title found for manga"))?;

    let author = media.staff.and_then(|staff| {
        staff
            .edges
            .iter()
            .find(|edge| edge.role.contains("Story") || edge.role.contains("Original Creator"))
            .map(|edge| edge.node.name.full.clone())
    });

    Ok((title, author, media.description))
}
