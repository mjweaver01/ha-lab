---
phase: 08-locations-hub-and-lifecycle
plan: 01
subsystem: api
tags: [bun, sqlite, locations, lifecycle, access-control]

# Dependency graph
requires:
  - phase: 07-e2e-media-trace
    provides: orchestrator route and migration testing patterns
provides:
  - Location lifecycle schema with soft archive metadata
  - Access-scoped locations repository and route handlers
  - Route-level automated tests for create/edit/archive/restore access boundaries
affects: [phase-08-plan-02, phase-08-plan-03, phase-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Scoped SQL reads/writes via location_members joins
    - Active-by-default list filtering with include_archived override
    - Non-leaky 403 access-denied route responses

key-files:
  created:
    - src/types/locations-api.ts
    - src/db/migrations/003_locations_lifecycle.sql
    - src/db/locations.ts
    - src/routes/locations.ts
  modified:
    - src/server.ts
    - src/routes/locations.test.ts
    - src/db/migrate.test.ts

key-decisions:
  - "Use x-user-id header integer parsing as the actor contract for Phase 8 server routes."
  - "Return generic 403 access denied payloads for inaccessible location mutations to prevent identifier leakage."
  - "Implement repository writes with Bun sqlite typed positional bindings to satisfy strict TypeScript checks."

patterns-established:
  - "Locations route module mirrors events route json/validation guard style."
  - "Route tests use ephemeral SQLite + createServer fixture for endpoint behavior verification."

requirements-completed: [LOC-01, LOC-02, LOC-03, LOC-04, LOC-05]

# Metrics
duration: 4 min
completed: 2026-04-16
---

# Phase 8 Plan 01: Location lifecycle backend summary

**Location lifecycle API foundation with access-scoped list/create/edit/archive/restore behavior backed by SQLite soft-archive schema and route-level boundary tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-15T23:53:06-04:00
- **Completed:** 2026-04-16T03:57:04Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added location data contracts and schema migration including `locations` and `location_members` lifecycle tables.
- Implemented scoped repository + route handlers for list/create/edit/archive/restore with actor validation.
- Added full route tests for active/default listing, include-archived behavior, lifecycle transitions, and non-leaky access denial.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create location data contracts and lifecycle schema** - `2c01cb4` (feat)
2. **Task 2: Implement locations route handlers and server dispatch** - `7448d83` (feat)
3. **Task 3: Add route-level tests for lifecycle and scope boundaries** - `66f86e4` (test)

Additional auto-fix commit:
- `8e4f37f` (fix): typed sqlite write bindings after lint/type failure

## Files Created/Modified
- `src/types/locations-api.ts` - Location request/response and lifecycle type contracts.
- `src/db/migrations/003_locations_lifecycle.sql` - Lifecycle schema and active partial index.
- `src/db/locations.ts` - Scoped repository list/create/edit/archive/restore operations.
- `src/routes/locations.ts` - HTTP handlers for lifecycle endpoints with non-leaky access checks.
- `src/server.ts` - `/locations` route dispatch and CORS branch integration.
- `src/routes/locations.test.ts` - Route-level lifecycle and access enforcement coverage.
- `src/db/migrate.test.ts` - Verification test name aligned to plan command.

## Decisions Made
- Used `x-user-id` parsing with strict integer validation and `400` for missing/invalid actor identity.
- Standardized access-denied responses to `{ "error": "access denied" }` for scoped mutation failures.
- Kept archive semantics soft-only (`archived_at` transitions) with no hard-delete repository surface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Verification command target test did not exist**
- **Found during:** Task 1 (Create location data contracts and lifecycle schema)
- **Issue:** Plan verification required `bun test src/db/migrate.test.ts -t "applies all migrations once"` but no matching test name existed.
- **Fix:** Renamed migration idempotency test to `applies all migrations once`.
- **Files modified:** `src/db/migrate.test.ts`
- **Verification:** `bun test src/db/migrate.test.ts -t "applies all migrations once"` passed.
- **Committed in:** `2c01cb4`

**2. [Rule 1 - Bug] Bun sqlite `run()` typed binding mismatch**
- **Found during:** Post-task lint verification after Task 3
- **Issue:** `Database.run` calls in `src/db/locations.ts` used named object/spread bindings that failed strict TypeScript checks.
- **Fix:** Converted write queries to positional `?` placeholders with binding arrays.
- **Files modified:** `src/db/locations.ts`
- **Verification:** `ReadLints` clean for edited files and `bun test src/db/migrate.test.ts src/routes/locations.test.ts` passed.
- **Committed in:** `8e4f37f`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were correctness/verification blockers and did not change scope.

## Issues Encountered
- Strict `Database.run` typings surfaced after implementation; resolved by switching to typed positional bindings.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend lifecycle contract and access safeguards for `LOC-01`..`LOC-05` are in place and verified.
- Ready for `08-02-PLAN.md` hub UI integration against the new `/locations` API surface.

## Known Stubs

None.

---
*Phase: 08-locations-hub-and-lifecycle*
*Completed: 2026-04-16*

## Self-Check: PASSED

- Verified required created files exist on disk.
- Verified task and deviation commit hashes exist in git history.
