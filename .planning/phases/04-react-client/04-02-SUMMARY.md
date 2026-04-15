---
phase: 04-react-client
plan: 02
subsystem: ui
tags: [react, bun, polling, cors]

requires:
  - phase: 04-react-client
    provides: fetchEvents, new-events helpers (04-01)
provides:
  - Browser Events screen with UI-SPEC copy and dark theme
  - Polling hook without full page reload
  - Dev CORS on orchestrator GET /events for split ports
affects:
  - Manual UAT with orchestrator + simulator

tech-stack:
  added: ""
  patterns: "Bun `bun ./src/client/index.html` client script; process.env.PUBLIC_* literals"

key-files:
  created:
    - src/client/index.html
    - src/client/main.tsx
    - src/client/events-screen.tsx
    - src/client/styles.css
    - src/client/hooks/use-events-poll.ts
  modified:
    - package.json
    - src/server.ts

key-decisions:
  - "Dev CORS * on GET /events for lab cross-origin client"
  - "Error UI uses fixed UI-SPEC copy; technical detail only in error state flag"

patterns-established:
  - "App shell mounts useEventsPoll → EventsScreen props"

requirements-completed: [UI-01, UI-02]

duration: 20min
completed: 2026-04-15
---

# Phase 4 Plan 2: Browser Events screen and polling

**React Events UI with 4s polling, accent rows for new ids, and orchestrator dev CORS — satisfies UI-01/UI-02 in the browser.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2

## Accomplishments

- Delivered Bun HTML entry and `bun run client` for the lab workflow.
- Wired `useEventsPoll` to `fetchEvents` with in-flight guard and `markNewEventIds` for accent styling.

## Task Commits

1. **Task 1: HTML entry, root mount, Events screen + styles** — `81b2740`
2. **Task 2: use-events-poll, Refresh + interval, CORS** — `502710e`

## Deviations from Plan

None.

## Self-Check: PASSED

- `bun test` full suite green
- No `location.reload` or `dangerouslySetInnerHTML` under `src/client`

## Next

Phase 4 implementation complete — run verification (`/gsd-verify-work` / verifier).
