-- Phase 8 follow-up: unify legacy home-scoped data under locations.
-- Creates location membership for legacy homes and migrates events/subscribers to location_id.

CREATE TABLE home_location_map (
  home_id INTEGER PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES locations (id) ON DELETE CASCADE
);

INSERT INTO locations (name, code, notes, created_at, updated_at)
SELECT
  h.name,
  NULL,
  '__migration_home_id:' || h.id,
  h.created_at,
  h.created_at
FROM homes h;

INSERT INTO home_location_map (home_id, location_id)
SELECT
  h.id,
  l.id
FROM homes h
JOIN locations l ON l.notes = '__migration_home_id:' || h.id;

INSERT OR IGNORE INTO location_members (location_id, user_id, created_at)
SELECT
  map.location_id,
  hm.user_id,
  hm.created_at
FROM home_members hm
JOIN home_location_map map ON map.home_id = hm.home_id;

CREATE TABLE events_next (
  id INTEGER PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  body TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE subscribers_next (
  id INTEGER PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  callback_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (location_id, callback_url)
);

CREATE TABLE event_deliveries_next (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events_next (id) ON DELETE CASCADE,
  subscriber_id INTEGER NOT NULL REFERENCES subscribers_next (id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  http_status INTEGER,
  error_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO events_next (id, location_id, event_type, body, created_at)
SELECT
  e.id,
  map.location_id,
  e.event_type,
  e.body,
  e.created_at
FROM events e
JOIN home_location_map map ON map.home_id = e.home_id;

INSERT INTO subscribers_next (id, location_id, callback_url, created_at)
SELECT
  s.id,
  map.location_id,
  s.callback_url,
  s.created_at
FROM subscribers s
JOIN home_location_map map ON map.home_id = s.home_id;

INSERT INTO event_deliveries_next (id, event_id, subscriber_id, status, http_status, error_text, created_at)
SELECT
  id,
  event_id,
  subscriber_id,
  status,
  http_status,
  error_text,
  created_at
FROM event_deliveries;

DROP TABLE event_deliveries;
DROP TABLE events;
DROP TABLE subscribers;

ALTER TABLE events_next RENAME TO events;
ALTER TABLE subscribers_next RENAME TO subscribers;
ALTER TABLE event_deliveries_next RENAME TO event_deliveries;

DROP TABLE home_members;
DROP TABLE homes;
DROP TABLE home_location_map;

UPDATE locations
SET notes = NULL
WHERE notes LIKE '__migration_home_id:%';

CREATE INDEX idx_events_location ON events (location_id);
CREATE INDEX idx_subscribers_location ON subscribers (location_id);
CREATE INDEX idx_event_deliveries_event ON event_deliveries (event_id);
