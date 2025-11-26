use reqwest::{Client, header};
use scraper::{Html, Selector};
use serde::Serialize;
use std::time::Duration;
use url::Url;

const MANGA_BASE: &str = "https://mangapill.com";

#[derive(Debug, Serialize)]
pub struct MangaResult {
    pub title: String,
    pub url: String,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Chapter {
    pub chapter: String,
    pub url: String,
}

#[derive(Debug, Serialize)]
pub struct Page {
    pub url: String,
}

fn create_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(10))
        .default_headers({
            let mut headers = header::HeaderMap::new();
            headers.insert("Referer", header::HeaderValue::from_static("https://mangapill.com/"));
            headers.insert("User-Agent", header::HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"));
            headers
        })
        .build()
        .unwrap()
}

pub async fn search_manga_pill(query: &str) -> anyhow::Result<Vec<MangaResult>> {
    let client = create_client();
    let url = format!(
        "{}/search?page=1&q={}",
        MANGA_BASE,
        urlencoding::encode(query)
    );

    let resp = client.get(&url).send().await?.text().await?;
    let document = Html::parse_document(&resp);

    let item_sel = Selector::parse(".grid > div:not([class])").unwrap();
    let a_sel = Selector::parse("a").unwrap();
    let title_sel = Selector::parse("div[class] > a").unwrap();
    let img_sel = Selector::parse("img").unwrap();

    let mut results = Vec::new();

    for el in document.select(&item_sel) {
        let Some(anchor) = el.select(&a_sel).next() else {
            continue;
        };
        let Some(rel_url) = anchor.value().attr("href") else {
            continue;
        };
        let full_url = Url::parse(MANGA_BASE)?.join(rel_url)?.to_string();

        let title = el
            .select(&title_sel)
            .next()
            .map(|t| t.text().collect::<String>().trim().to_owned())
            .unwrap_or_default();

        if title.is_empty() {
            continue;
        }

        let thumbnail = el
            .select(&img_sel)
            .next()
            .and_then(|i| i.value().attr("data-src"))
            .map(str::to_owned);

        results.push(MangaResult {
            title,
            url: full_url,
            thumbnail,
        });
    }

    Ok(results)
}

pub async fn get_manga_pill_chapters(manga_url: &str) -> anyhow::Result<Vec<Chapter>> {
    if !manga_url.starts_with("http") {
        return Err(anyhow::anyhow!("Invalid manga URL"));
    }

    let client = create_client();
    let path = Url::parse(manga_url)?.path().to_string();
    let resp = client
        .get(format!("{}{}", MANGA_BASE, path))
        .send()
        .await?
        .text()
        .await?;
    let document = Html::parse_document(&resp);

    let chapter_sel = Selector::parse("#chapters > div > a").unwrap();
    let mut chapters = Vec::new();

    for el in document.select(&chapter_sel) {
        let Some(rel_url) = el.value().attr("href") else {
            continue;
        };
        let chapter_url = Url::parse(MANGA_BASE)?.join(rel_url)?.to_string();
        let chapter_title = el.text().collect::<String>().trim().to_owned();
        let chapter_title = if chapter_title.is_empty() {
            "Unknown Chapter".to_string()
        } else {
            chapter_title
        };

        chapters.push(Chapter {
            chapter: chapter_title,
            url: chapter_url,
        });
    }

    Ok(chapters)
}

pub async fn get_manga_pill_pages(chapter_url: &str) -> anyhow::Result<Vec<Page>> {
    if !chapter_url.starts_with("http") {
        return Err(anyhow::anyhow!("Invalid chapter URL"));
    }

    let client = create_client();
    let path = Url::parse(chapter_url)?.path().to_string();
    let resp = client
        .get(format!("{}{}", MANGA_BASE, path))
        .send()
        .await?
        .text()
        .await?;
    let document = Html::parse_document(&resp);

    let img_sel = Selector::parse("picture img").unwrap();
    let pages: Vec<Page> = document
        .select(&img_sel)
        .filter_map(|el| el.value().attr("data-src"))
        .map(|url| Page {
            url: url.to_string(),
        })
        .collect();

    Ok(pages)
}
