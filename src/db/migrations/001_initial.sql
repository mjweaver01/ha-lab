-- Phase 1 initial schema: migration tracking, users, homes, membership (D-01–D-06).
-- Composite primary key on home_members (home_id, user_id) with UNIQUE constraint implied by PK.

CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE homes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE home_members (
  home_id INTEGER NOT NULL REFERENCES homes (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (home_id, user_id)
);

CREATE INDEX idx_home_members_home ON home_members (home_id);
CREATE INDEX idx_home_members_user ON home_members (user_id);
