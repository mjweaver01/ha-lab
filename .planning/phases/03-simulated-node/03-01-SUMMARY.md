---
phase: 03-simulated-node
plan: 01
subsystem: testing
tags: [bun, fetch, cli, PostEventBody]

requires:
  - phase: 02-webhook-orchestrator
    provides: POST /events, PostEventBody field names
provides:
  - Simulated node CLI posting motion, door, and camera.stub events via fetch
  - Exported URL helpers and payload factories for lab E2E
affects:
  - Phase 4 (live traffic / integration)

tech-stack:
  added: []
  patterns:
    - "Bun CLI with import.meta.main and node:util parseArgs"
    - "Mock global fetch in bun:test for POST assertions"

key-files:
  created:
    - scripts/simulated-node.ts
    - scripts/simulated-node.test.ts
  modified:
    - package.json

key-decisions:
  - "Validated orchestrator base URLs with URL parser and http/https-only scheme (SSRF hygiene per plan)"
  - "Truncated error response bodies to 200 chars on failed POST"

patterns-established:
  - "Sample events ordered motion → door → camera.stub in one CLI run"

requirements-completed: [NODE-01]

duration: 12min
completed: 2026-04-15
---

# Phase 3 Plan 1: Simulated node Summary

**Bun CLI + tests that POST Phase 2 `PostEventBody` JSON to `ORCHESTRATOR_URL/events` with motion, door, and camera.stub in one run, plus `bun run simulate`.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-15T18:30:00Z
- **Completed:** 2026-04-15T18:42:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Exported `PostEventBody`, URL helpers (`normalizeOrchestratorBaseUrl`, `eventsPostUrl`), and sample factories matching Phase 2 lock
- `postEvent` + CLI with `--url` / `--home` and `ORCHESTRATOR_URL`; non-zero exit on HTTP error
- `bun:test` coverage for URLs, payloads, scheme rejection, and mocked `fetch` POST

## Task Commits

1. **Task 1: Payload contract, URL helpers, and unit tests** — `1b101ce` (feat)
2. **Task 2: fetch POST, CLI entry, package.json script, exit codes** — `58fa3de` (feat)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified

- `scripts/simulated-node.ts` — Contract, helpers, `postEvent`, CLI `main`
- `scripts/simulated-node.test.ts` — URL/payload tests + mocked `fetch` for POST
- `package.json` — `"simulate": "bun run scripts/simulated-node.ts"`

## Decisions Made

- Followed plan `interfaces` block for `PostEventBody` and default event order
- Error path logs HTTP status and up to 200 chars of response text only (threat model)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. Manual smoke: start Phase 2 orchestrator, `ORCHESTRATOR_URL=http://127.0.0.1:<port> bun run simulate`.

## Next Phase Readiness

Simulated node ready for end-to-end lab with Phase 2; Phase 4 can assume `bun run simulate` exists.

## Self-Check: PASSED

- `bun test` from repo root: 14 pass
- Acceptance greps from plan (ORCHESTRATOR_URL, simulate script, POST) verified during Task 2

---
*Phase: 03-simulated-node*
*Completed: 2026-04-15*
