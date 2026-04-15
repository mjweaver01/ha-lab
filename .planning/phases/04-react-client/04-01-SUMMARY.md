---
phase: 04-react-client
plan: 01
subsystem: ui
tags: [react, bun, fetch, testing]

requires:
  - phase: 02-webhook-orchestrator
    provides: GET /events?home_id= JSON contract
provides:
  - Typed fetchEvents + EventListItem aligned with Phase 2 routes
  - Pure new-event id helpers for polling UI-02
  - bunfig PUBLIC_* inlining for client bundle
affects:
  - 04-02 (React screen consumes fetchEvents)

tech-stack:
  added: "react 19.2.5, react-dom, @types/react, @types/react-dom, happy-dom, @testing-library/react"
  patterns: "Bun HTML env inlining via [serve.static] env = PUBLIC_*; mocked fetch in bun:test"

key-files:
  created:
    - bunfig.toml
    - src/client/api/events-client.ts
    - src/client/api/events-client.test.ts
    - src/client/lib/new-events.ts
    - src/client/lib/new-events.test.ts
  modified:
    - package.json
    - bun.lock
    - tsconfig.json

key-decisions:
  - "First poll uses empty new-id set so the initial list is not all highlighted as new"
  - "Event rows validated field-by-field; body optional from API"

patterns-established:
  - "GET client uses URL + searchParams for home_id encoding"

requirements-completed: [UI-01, UI-02]

duration: 15min
completed: 2026-04-15
---

# Phase 4 Plan 1: Client API and new-event helpers

**Typed GET /events client and pure poll-diff helpers with bun:test — foundation for the Events UI without shipping browser entry yet.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2
- **Files:** 9 touched (4 new source/test + config)

## Accomplishments

- Locked React + Bun HTML bundler config with `PUBLIC_*` inlining for the upcoming SPA.
- Implemented `fetchEvents` mirroring Phase 2 list JSON and `maxEventId` / `markNewEventIds` for accent rows on poll.

## Task Commits

1. **Task 1: Dependencies and Bun HTML bundler config** — `e962d22`
2. **Task 2: events-client + new-event helpers + tests** — `d8c717b`

## Files Created/Modified

- `bunfig.toml` — `[serve.static] env = "PUBLIC_*"`
- `src/client/api/events-client.ts` — `fetchEvents`, `EventListItem`
- `src/client/lib/new-events.ts` — `maxEventId`, `markNewEventIds`
- Co-located `*.test.ts` — mocked `fetch`

## Deviations from Plan

None — plan executed as written.

## Self-Check: PASSED

- `bun test` full suite green
- Acceptance greps satisfied (searchParams `home_id`, no `dangerouslySetInnerHTML` under `src/client/api`)

## Next

Ready for **04-02** (browser Events screen + polling hook).
