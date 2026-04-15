---
status: testing
phase: milestone-v1
source:
  - 01-data-model-sqlite/01-01-SUMMARY.md
  - 01-data-model-sqlite/01-02-SUMMARY.md
  - 02-webhook-orchestrator/02-01-SUMMARY.md
  - 02-webhook-orchestrator/02-02-SUMMARY.md
  - 03-simulated-node/03-01-SUMMARY.md
  - 04-react-client/04-01-SUMMARY.md
  - 04-react-client/04-02-SUMMARY.md
phases_covered: "1,2,3,4"
started: "2026-04-15T00:00:00.000Z"
updated: "2026-04-15T00:00:00.000Z"
---

## Current Test

number: 1
name: Cold start — migrate and orchestrator boot
expected: |
  No stray Bun server on port 3000 (or use another PORT). From repo root, run `bun run migrate` — it exits 0 with no stack trace. Then start the orchestrator (`bun run dev` or `bun run index.ts` per your README) — process stays up and `curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000/events"` returns **400** (home_id required), not **000** (connection refused). That proves migrations + HTTP router are alive.
awaiting: user response

## Tests

### 1. Cold start — migrate and orchestrator boot
expected: Migrate succeeds; server responds on /events (400 without home_id is OK).
result: [pending]

### 2. [P1] SQLite — migrations idempotent and schema present
expected: Running `bun run migrate` a second time still exits 0. You can confirm schema exists (e.g. `sqlite3` on your DB file shows `homes`, `events` tables) or rely on `bun test src/db/migrate.test.ts` passing.
result: [pending]

### 3. [P2] POST /events then GET /events lists rows
expected: With a valid `home_id` that exists in `homes`, POST `/events` with JSON `{"home_id":N,"event_type":"uat"}` returns **201** and a JSON body with an `id`. GET `/events?home_id=N` returns a JSON array that includes that event (newest-first is fine).
result: [pending]

### 4. [P2] Fan-out — two subscribers receive delivery attempts
expected: POST two different `/subscribers` for the same `home_id` (callback URLs can point to httpbin/requestbin or any two distinct HTTPS URLs you control). POST one `/events` for that home. You see two rows in `event_deliveries` for that event id, or two outbound HTTP attempts in logs — matching HOOK-04 intent.
result: [pending]

### 5. [P3] Simulated node CLI posts multiple event types
expected: With orchestrator running, `ORCHESTRATOR_URL=http://127.0.0.1:3000` (adjust if needed) `bun run simulate` exits **0**. GET `/events?home_id=<same home>` shows new rows including **motion**, **door**, and **camera.stub** (or equivalent sample types from the script).
result: [pending]

### 6. [P4] React client — list, refresh, live updates
expected: In a second terminal, `PUBLIC_ORCHESTRATOR_URL=http://127.0.0.1:3000` and `PUBLIC_HOME_ID=<N>` matching your seeded home, run `bun run client`. Browser shows the Events screen (dark theme), empty or list per UI-SPEC. Click **Refresh events** updates without full page reload. With orchestrator + simulate posting new events, new rows appear within one poll interval and new rows use the accent treatment (#3d8bfd) when applicable.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

[none yet]
