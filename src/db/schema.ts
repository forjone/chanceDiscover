// Raw SQL schema. We use @libsql/client directly (no migration tooling) so the
// schema bootstraps reliably in ephemeral/serverless environments and on Turso.

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    store_id TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'us',
    category TEXT,
    icon_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (platform, store_id, country)
  )`,

  `CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    external_id TEXT,
    author TEXT,
    title TEXT,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 0,
    version TEXT,
    review_date TEXT,
    sentiment REAL NOT NULL DEFAULT 0,
    pay_intent INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (app_id, external_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_reviews_app ON reviews(app_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating)`,

  `CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    params TEXT NOT NULL DEFAULT '{}',
    stats TEXT NOT NULL DEFAULT '{}',
    log TEXT NOT NULL DEFAULT '',
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS pain_clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER REFERENCES runs(id) ON DELETE SET NULL,
    label TEXT NOT NULL,
    keywords TEXT NOT NULL DEFAULT '[]',
    summary TEXT NOT NULL DEFAULT '',
    review_count INTEGER NOT NULL DEFAULT 0,
    avg_rating REAL NOT NULL DEFAULT 0,
    avg_sentiment REAL NOT NULL DEFAULT 0,
    pay_intent_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS cluster_reviews (
    cluster_id INTEGER NOT NULL REFERENCES pain_clusters(id) ON DELETE CASCADE,
    review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    PRIMARY KEY (cluster_id, review_id)
  )`,

  `CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER REFERENCES runs(id) ON DELETE SET NULL,
    cluster_id INTEGER REFERENCES pain_clusters(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    pain_point TEXT NOT NULL DEFAULT '',
    target_users TEXT NOT NULL DEFAULT '',
    evidence TEXT NOT NULL DEFAULT '[]',
    frequency INTEGER NOT NULL DEFAULT 0,
    existing_solutions TEXT NOT NULL DEFAULT '',
    gaps TEXT NOT NULL DEFAULT '',
    suggested_format TEXT NOT NULL DEFAULT '',
    reverse_diligence TEXT NOT NULL DEFAULT '',
    score_demand REAL NOT NULL DEFAULT 0,
    score_payment REAL NOT NULL DEFAULT 0,
    score_gap REAL NOT NULL DEFAULT 0,
    score_timing REAL NOT NULL DEFAULT 0,
    score_total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE INDEX IF NOT EXISTS idx_opps_score ON opportunities(score_total DESC)`,

  `CREATE TABLE IF NOT EXISTS trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'reviews',
    momentum REAL NOT NULL DEFAULT 0,
    data_points TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (keyword, source)
  )`,

  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // Append-only per-run cluster snapshots — powers pain-point evolution tracking
  // across runs (pain_clusters is rebuilt each run; this is never cleared).
  `CREATE TABLE IF NOT EXISTS cluster_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    signature TEXT NOT NULL,
    label TEXT NOT NULL,
    keywords TEXT NOT NULL DEFAULT '[]',
    review_count INTEGER NOT NULL DEFAULT 0,
    avg_rating REAL NOT NULL DEFAULT 0,
    score_total REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE INDEX IF NOT EXISTS idx_snap_sig ON cluster_snapshots(signature)`,

  // Generated downstream artifacts (PRD / landing copy / tasks / research).
  // Keyed by opportunity *title* so they survive re-mining (ids are regenerated).
  `CREATE TABLE IF NOT EXISTS artifacts (
    opp_title TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'template',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (opp_title, type)
  )`,
];

// Idempotent migrations for columns added after the initial schema. Each runs
// inside ensureSchema and tolerates "duplicate column" on already-migrated DBs.
export const MIGRATIONS: string[] = [
  `ALTER TABLE opportunities ADD COLUMN notes TEXT NOT NULL DEFAULT ''`,
];
