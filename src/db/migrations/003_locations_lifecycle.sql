-- Phase 8: location lifecycle schema with soft archive semantics.

CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  code TEXT UNIQUE,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT,
  archived_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  archive_reason TEXT
);

CREATE TABLE location_members (
  location_id INTEGER NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (location_id, user_id)
);

CREATE INDEX idx_location_members_location ON location_members (location_id);
CREATE INDEX idx_location_members_user ON location_members (user_id);
CREATE INDEX idx_locations_active ON locations (updated_at DESC, id DESC) WHERE archived_at IS NULL;
