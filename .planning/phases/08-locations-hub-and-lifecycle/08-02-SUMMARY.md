---
phase: 08-locations-hub-and-lifecycle
plan: 02
subsystem: ui
tags: [react, bun-test, locations, lifecycle]
requires:
  - phase: 08-01
    provides: location lifecycle routes and DB-backed location APIs
provides:
  - dense locations hub table with lifecycle actions
  - shared create/edit location form contract and detail screen
  - regression tests for archived filter and navigation behavior
affects: [phase-08-navigation, phase-09-location-detail]
tech-stack:
  added: []
  patterns:
    - dependency-injected API handlers for deterministic screen tests
    - shared location form utilities reused by detail/edit flows
key-files:
  created:
    - src/client/api/locations-client.ts
    - src/client/lib/location-form.ts
    - src/client/locations-screen.tsx
    - src/client/location-detail-screen.tsx
    - src/client/locations-screen.test.tsx
  modified:
    - src/client/styles.css
key-decisions:
  - "Persist include-archived state in sessionStorage for page-session continuity."
  - "Normalize location mutation payloads to name/code/notes only before network writes."
  - "Inject locations API dependencies into LocationsScreen so behavior tests can mock lifecycle calls."
patterns-established:
  - "LocationsScreen owns hub lifecycle interactions and delegates data access via API helpers."
  - "LocationDetailScreen uses location-form validation/payload mapping for both create and edit."
requirements-completed: [LOC-01, LOC-02, LOC-03, LOC-04, LOC-05, VIEW-01]
duration: 6 min
completed: 2026-04-16
---

# Phase 08 Plan 02: Locations hub and lifecycle Summary

**Dense locations hub and dedicated create/edit surfaces shipped with archived lifecycle controls, shared validation model, and regression coverage for VIEW-01 navigation paths.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-16T04:00:22Z
- **Completed:** 2026-04-16T04:06:37Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added typed location lifecycle client wrappers with status-aware error handling and actor headers.
- Implemented Locations hub table with Include archived toggle, archive confirmation flow, restore action, and row/Open navigation parity.
- Added Location detail/edit form screen using shared validation and payload mapping contract.
- Expanded client tests to cover hub states, archived toggling, lifecycle actions, and required-name UI validation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build typed locations client and shared form contract** - `537a0be` (test), `34bed0b` (feat)
2. **Task 2: Implement dense locations hub and dedicated detail/edit surfaces** - `35670cd` (test), `6d257a4` (feat)
3. **Task 3: Add client behavior tests for hub states and lifecycle actions** - `11c6e61` (test)

## Files Created/Modified
- `src/client/api/locations-client.ts` - typed lifecycle client methods with status/error normalization and payload whitelisting.
- `src/client/lib/location-form.ts` - shared form defaults, required-name validation, and write payload mapping.
- `src/client/locations-screen.tsx` - dense hub table, archived toggle persistence, lifecycle actions, and VIEW-01 callbacks.
- `src/client/location-detail-screen.tsx` - dedicated create/edit surface with shared form validation.
- `src/client/locations-screen.test.tsx` - behavior regression coverage for states, archived flows, and navigation.
- `src/client/styles.css` - shared `ui-*` primitives plus locations/media-specific semantic layout styles.

## Decisions Made
- Chose explicit API helpers per lifecycle action (`fetch`, `create`, `update`, `archive`, `restore`) to mirror server route boundaries and keep future RBAC behavior testable.
- Kept hub error copy non-leaky and standardized to UI-SPEC text so access-denied internals are not surfaced in UI.
- Added API dependency injection to `LocationsScreen` to make lifecycle behavior deterministic in test coverage without brittle global network mocks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added API dependency injection for stable behavior tests**
- **Found during:** Task 3 (hub lifecycle behavior tests)
- **Issue:** Direct module-bound API calls in the screen made deterministic state/lifecycle mocking brittle for acceptance tests.
- **Fix:** Added optional `api` dependency injection prop to `LocationsScreen` and exported API arg types for typed test stubs.
- **Files modified:** `src/client/locations-screen.tsx`, `src/client/api/locations-client.ts`, `src/client/locations-screen.test.tsx`
- **Verification:** `bun test src/client/locations-screen.test.tsx`
- **Committed in:** `11c6e61`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Kept scope focused; change was testability scaffolding required to satisfy lifecycle acceptance checks reliably.

## Issues Encountered
- React test runner emits `act(...)` warnings for async state transitions in hub lifecycle tests, but assertions and command-level verification pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Locations hub/detail UI surfaces and lifecycle contracts are in place for plan 08-03 app-shell navigation wiring.
- Regression tests now lock LOC-01..LOC-05 behaviors and VIEW-01 callback parity at component level.

## Self-Check: PASSED

- Verified summary file exists at `.planning/phases/08-locations-hub-and-lifecycle/08-02-SUMMARY.md`.
- Verified task commits exist: `537a0be`, `34bed0b`, `35670cd`, `6d257a4`, `11c6e61`.
