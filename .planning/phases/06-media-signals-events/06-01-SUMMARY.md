---
phase: 06-media-signals-events
plan: 01
subsystem: api
tags: [mediapipe, events, client-api, tdd]
requires:
  - phase: 05-local-media-capture
    provides: Browser mic/camera capture primitives consumed by phase 6 signal work.
provides:
  - Centralized media event type constants and JSON-safe payload builders.
  - Typed client postEvent transport for POST /events.
  - Automated postEvent transport tests covering success and error behavior.
affects: [06-02, 06-03, media-signal-pipeline]
tech-stack:
  added: [@mediapipe/tasks-audio, @mediapipe/tasks-vision]
  patterns: [centralized event payload builders, typed client POST helper, tdd-red-green]
key-files:
  created:
    - src/client/lib/media-event-types.ts
    - src/client/api/events-client.post.test.ts
  modified:
    - package.json
    - bun.lock
    - src/client/api/events-client.ts
key-decisions:
  - "Use a shared media-event-types module as the single source of truth for media.audio/media.video and normalized body fields."
  - "Keep postEvent error wrapping aligned with fetchEvents so client transport failures stay consistent across GET and POST paths."
patterns-established:
  - "Pattern: buildAudioEventBody/buildVideoEventBody enforce trimmed labels and clamped [0,1] scores."
  - "Pattern: postEvent validates home_id + event_type before sending JSON payloads."
requirements-completed: [MEDIA-03, MEDIA-04]
duration: 2 min
completed: 2026-04-15
---

# Phase 6 Plan 01: Media event contract + POST transport Summary

**Media audio/video event constants and JSON-safe payload builders now pair with a typed `postEvent` client helper and transport tests, locking the shared contract before signal wiring.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-15T19:29:15Z
- **Completed:** 2026-04-15T19:32:02Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `@mediapipe/tasks-audio` and `@mediapipe/tasks-vision` dependencies for upcoming classifier integration.
- Created `media-event-types` helpers to normalize media payload labels/scores into JSON-safe values.
- Implemented `postEvent` with validation, normalized `/events` URL construction, and consistent HTTP/network error handling.
- Added and passed POST transport tests for success, non-2xx, and network failure paths.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add locked media event contract module and install MediaPipe packages** - `862e6dc` (chore)
2. **Task 2 (RED): Implement and test typed `postEvent` transport helper** - `8d388d7` (test)
3. **Task 2 (GREEN): Implement and test typed `postEvent` transport helper** - `30a5394` (feat)

## Files Created/Modified
- `src/client/lib/media-event-types.ts` - Defines shared media event constants and normalized payload builders.
- `src/client/api/events-client.post.test.ts` - Verifies `postEvent` request shape and error behavior.
- `src/client/api/events-client.ts` - Adds typed `postEvent` transport helper and shared `/events` URL helper.
- `package.json` - Adds MediaPipe task dependencies.
- `bun.lock` - Locks installed MediaPipe package versions.

## Decisions Made
- Centralized media event naming/body conventions in a dedicated module to prevent drift across audio and video emitters.
- Normalized `event_type` via trim + non-empty validation before POST so malformed payloads fail early at the client boundary.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase `06-02` can now consume stable `media.audio`/`media.video` constants and payload builders for classifier-driven emission.
- Typed POST transport and tests are in place for throttled signal loops to call directly.

---
*Phase: 06-media-signals-events*
*Completed: 2026-04-15*

## Self-Check: PASSED
- Found `.planning/phases/06-media-signals-events/06-01-SUMMARY.md`
- Verified commits: `862e6dc`, `8d388d7`, `30a5394`
