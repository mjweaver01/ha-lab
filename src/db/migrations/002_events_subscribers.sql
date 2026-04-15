-- Phase 2: events ingestion, per-home subscribers, delivery audit (HOOK-02–HOOK-04).

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  home_id INTEGER NOT NULL REFERENCES homes (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  body TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  home_id INTEGER NOT NULL REFERENCES homes (id) ON DELETE CASCADE,
  callback_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (home_id, callback_url)
);

CREATE TABLE event_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  subscriber_id INTEGER NOT NULL REFERENCES subscribers (id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  http_status INTEGER,
  error_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_home ON events (home_id);
CREATE INDEX idx_subscribers_home ON subscribers (home_id);
CREATE INDEX idx_event_deliveries_event ON event_deliveries (event_id);
