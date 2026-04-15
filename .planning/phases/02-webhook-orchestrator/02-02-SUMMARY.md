---
phase: 02-webhook-orchestrator
plan: 02
subsystem: api
tags: [bun, http, sqlite, webhooks, testing]

requires:
  - phase: 02-webhook-orchestrator
    provides: events/subscribers DDL and PostEventBody types (plan 02-01)
provides:
  - Bun.serve orchestrator with POST/GET /events and POST /subscribers
  - Fan-out with Promise.allSettled and event_deliveries rows
  - Integration tests with ephemeral port and selective fetch mock for HOOK-04
affects: [03-simulated-node, 04-react-client]

tech-stack:
  added: []
  patterns: [fetch-based Bun router, selective global fetch mock in tests]

key-files:
  created:
    - src/server.ts
    - src/routes/events.ts
    - src/routes/subscribers.ts
    - src/webhooks/fan-out.ts
    - src/webhooks/fan-out.test.ts
    - src/orchestrator.integration.test.ts
  modified:
    - src/db/database.ts
    - index.ts
    - package.json

key-decisions:
  - "Single fetch() router on Bun.serve so Response status codes match handlers (201 for creates)"
  - "Integration tests proxy same-origin fetch to real server while mocking subscriber callback URLs"

patterns-established:
  - "await deliverEventToSubscribers before returning POST /events so tests can assert deliveries without races"

requirements-completed: [HOOK-01, HOOK-02, HOOK-03, HOOK-04]

duration: 35min
completed: 2026-04-15
---

# Phase 2: Webhook orchestrator — Plan 02 Summary

**Bun HTTP service with locked `PostEventBody`, persisted subscribers, GET listing by `home_id`, and parallel fan-out with recorded deliveries — verified with mocked `fetch` for two subscribers.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-15T19:00:00Z
- **Completed:** 2026-04-15T19:35:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Implemented `deliverEventToSubscribers` with `Promise.allSettled`, parameterized SQL, and `event_deliveries` inserts.
- Wired `Bun.serve` with `PORT` / `SQLITE_PATH`, route handlers, and `index.ts` dev entry.
- Added integration coverage for HOOK-01–HOOK-04 using `port: 0` and a selective `fetch` mock so the client hits the real server while subscriber URLs are mocked.

## Task Commits

1. **Task 1: Fan-out service + delivery persistence** — `8fc7250` (feat)
2. **Task 2: Bun.serve routes for events and subscribers** — `e9e8e61` (feat)
3. **Task 3: Integration tests — ephemeral port + mock fetch** — `5a9b665` (test)

## Files Created/Modified

- `src/webhooks/fan-out.ts` — fan-out and delivery persistence
- `src/webhooks/fan-out.test.ts` — isolated fan-out test
- `src/server.ts` — `createServer`, env defaults
- `src/routes/events.ts` — POST/GET `/events`
- `src/routes/subscribers.ts` — POST `/subscribers`
- `src/orchestrator.integration.test.ts` — end-to-end HOOK assertions
- `src/db/database.ts` — doc comment on FK pragma
- `index.ts`, `package.json` — entry and scripts

## Decisions Made

- Used an explicit `fetch` handler for routing so JSON handlers return **201** reliably (Bun `routes` shorthand was returning **200** for POSTs in this environment).

## Deviations from Plan

- Routing uses `Bun.serve({ fetch })` instead of a `routes` map only — still `Bun.serve`, preserves behavior and status codes.

## Issues Encountered

- Global `fetch` mock in integration tests intercepted calls to the orchestrator; fixed with a selective mock that forwards same-origin requests to `originalFetch`.

## User Setup Required

None.

## Next Phase Readiness

- Phase 3 can POST sample payloads to the running orchestrator URL; Phase 4 can consume GET `/events`.

## Self-Check: PASSED

- `bun test` full suite green.

---
*Phase: 02-webhook-orchestrator*
*Completed: 2026-04-15*
