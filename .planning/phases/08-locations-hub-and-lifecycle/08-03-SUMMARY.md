---
phase: 08-locations-hub-and-lifecycle
plan: 03
subsystem: ui
tags: [react, navigation, integration-tests, locations]
requires:
  - phase: 08-01
    provides: location lifecycle APIs and access-scoped location contracts
  - phase: 08-02
    provides: locations hub and detail/edit UI surfaces
provides:
  - app-shell routing between events, settings, locations hub, and location detail
  - selected location handoff from hub interactions into detail surface
  - app-level navigation regression coverage for hub/detail/open/back/remount flow
affects: [phase-08-navigation, phase-09-location-detail]
tech-stack:
  added: []
  patterns:
    - app shell dependency-injection seam for deterministic navigation integration tests
    - location detail navigation state split into screen plus selectedLocationId
key-files:
  created:
    - src/client/main.locations-nav.test.tsx
  modified:
    - src/client/main.tsx
    - src/client/locations-screen.tsx
    - src/client/location-detail-screen.tsx
key-decisions:
  - "Route app-shell navigation using explicit screen state and selectedLocationId to preserve deterministic transitions."
  - "Use a browser-only bootstrap guard in main.tsx so App can be imported directly by navigation tests."
patterns-established:
  - "App-level location navigation should be tested via injected screen dependencies instead of module-level mocking."
requirements-completed: [VIEW-01]
duration: 3 min
completed: 2026-04-16
---

# Phase 08 Plan 03: Locations hub and lifecycle Summary

**App shell now navigates from events into locations hub and location detail with selected-id continuity and regression coverage for open/back/remount behavior.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-16T04:08:48Z
- **Completed:** 2026-04-16T04:11:48Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added app-shell screen routing for `events`, `settings`, `locations`, and `location-detail` in `main.tsx`.
- Added `selectedLocationId` navigation state and passed it into detail mode transitions.
- Wired locations hub `Create location` and `Open` pathways into detail navigation and back-to-hub transitions.
- Added integration navigation tests validating default screen, hub transition, detail open, selected-id propagation, back behavior, and rerender continuity.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add app-shell screen routing for locations hub and detail** - `6266e9a` (feat)
2. **Task 2: Add navigation integration tests for hub and detail transitions** - `3de6830` (feat)

## Files Created/Modified
- `src/client/main.tsx` - app-shell route orchestration, selected location state, and location create/edit submit wiring.
- `src/client/main.locations-nav.test.tsx` - integration navigation regression coverage for open/back/remount flows.
- `src/client/locations-screen.tsx` - create button callback wiring to app-shell location-detail navigation.
- `src/client/location-detail-screen.tsx` - optional `locationId` surface contract for app-shell-selected detail context.

## Decisions Made
- Kept navigation state in app shell (`screen`, `selectedLocationId`, `locationDetailMode`) so transitions remain explicit and testable across remounts.
- Added dependency injection seams to `App` so integration tests can validate route flow without brittle global mocks.
- Kept existing media settings path intact while adding locations navigation controls from the default events view.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guarded browser bootstrap for test imports**
- **Found during:** Task 1 verification (`bun test src/client/main.locations-nav.test.tsx -t "open location detail"`)
- **Issue:** Importing `main.tsx` in test context crashed with `ReferenceError: document is not defined`.
- **Fix:** Wrapped root bootstrap in `if (typeof document !== "undefined")` to keep browser mount behavior while allowing test imports.
- **Files modified:** `src/client/main.tsx`
- **Verification:** `bun test src/client/main.locations-nav.test.tsx -t "open location detail"` and `bun test src/client/main.locations-nav.test.tsx`
- **Committed in:** `6266e9a`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** No scope creep; fix was required to make app-shell integration tests executable.

## Issues Encountered
- Task 2 rerender assertion initially attempted to re-open hub via the shell button while already on hub screen; adjusted test flow to assert remount continuity from current hub state.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- VIEW-01 app-shell navigation is now covered by integration tests and stable state transitions.
- Phase 09 can build location detail scoped data surfaces on top of the now-wired location selection flow.

## Self-Check: PASSED

- Verified summary file exists at `.planning/phases/08-locations-hub-and-lifecycle/08-03-SUMMARY.md`.
- Verified task commits exist: `6266e9a`, `3de6830`.
