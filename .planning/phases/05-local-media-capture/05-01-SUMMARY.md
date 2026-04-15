---
phase: 05-local-media-capture
plan: 01
subsystem: ui
tags: [react, getUserMedia, web-audio, bun-test]

requires:
  - phase: 04
    provides: React Events client and patterns
provides:
  - Pure media error copy helpers aligned with UI-SPEC
  - useMediaCapture hook with mic level, camera stream, cleanup
affects: [05-02]

tech-stack:
  added: []
  patterns: [AnalyserNode RMS level meter, mocked getUserMedia in tests]

key-files:
  created:
    - src/client/lib/media-errors.ts
    - src/client/lib/media-errors.test.ts
    - src/client/hooks/use-media-capture.ts
    - src/client/hooks/use-media-capture.test.ts
  modified: []

key-decisions:
  - Blocked/dismissed errors use first-sentence device naming plus macOS System Settings remediation per UI-SPEC table.
  - Revoked mid-capture uses formatTrackEndedMessage; track.onended wires to that path.

patterns-established:
  - "Media errors: single formatter for DOMException names + generic fallback."
  - "Hook: stop tracks + close AudioContext on device stop and on unmount."

requirements-completed: [MEDIA-01, MEDIA-02]

duration: 25min
completed: 2026-04-15
---

# Phase 5 Plan 01 Summary

**Isolated capture logic:** UI-SPEC-aligned error strings, a `useMediaCapture` hook with independent mic/camera streams, Web Audio level analysis, and happy-dom tests with mocked `getUserMedia` — ready for Plan 02 UI wiring.

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files created:** 4

## Accomplishments

- `formatMediaError` / `formatTrackEndedMessage` cover blocked, not-found, not-readable, and track-ended paths without silent failures.
- `useMediaCapture` exposes mic/camera state, `micLevel` from `AnalyserNode`, `videoRef` for preview, and full cleanup on stop and unmount.

## Task Commits

1. **Task 1: Media error strings** — `9c910a1` (feat)
2. **Task 2: useMediaCapture hook + tests** — `6260e9b` (feat)

## Files Created/Modified

- `src/client/lib/media-errors.ts` — User-facing strings for capture failures.
- `src/client/lib/media-errors.test.ts` — Bun tests for error branches.
- `src/client/hooks/use-media-capture.ts` — Capture hook (no `POST /events`).
- `src/client/hooks/use-media-capture.test.ts` — Hook tests with mocks.

## Verification

- `bun test src/client/lib/media-errors.test.ts src/client/hooks/use-media-capture.test.ts` — pass
- `bun test` (repository-wide) — pass

## Self-Check: PASSED

## Deviations

- None.
