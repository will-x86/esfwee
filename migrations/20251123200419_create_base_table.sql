CREATE TABLE manga (
    anilist_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    storage_path TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anilist_id INTEGER NOT NULL REFERENCES manga(anilist_id) ON DELETE CASCADE,
    chapter_number REAL NOT NULL,
    title TEXT,
    page_count INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(anilist_id, chapter_number)
);

CREATE INDEX idx_chapters_manga ON chapters(anilist_id);
