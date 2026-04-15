---
phase: 05-local-media-capture
plan: 02
subsystem: ui
tags: [react, getUserMedia, testing-library]

requires:
  - phase: 05-01
    provides: useMediaCapture hook and media-errors
provides:
  - Collapsible Media capture UI on Events page
  - UI-SPEC copy, meter, video preview, role=alert errors
affects: [06]

tech-stack:
  added: []
  patterns: [details/summary collapsible, GlobalWindow in tests]

key-files:
  created:
    - src/client/media-capture-section.tsx
    - src/client/media-capture-section.test.tsx
  modified:
    - src/client/events-screen.tsx
    - src/client/styles.css

key-decisions:
  - MediaCaptureSection is placed after `events-page__meta` and before `events-toolbar` for discoverability without scrolling past the list.
  - Component tests use real hook with mocked `navigator.mediaDevices` and `AudioContext` (no mock.module) to avoid cross-file mock leakage.

patterns-established:
  - "Errors: single panel with class events-error and role=alert; mic and camera lines as child divs."

requirements-completed: [MEDIA-01, MEDIA-02]

duration: 20min
completed: 2026-04-15
---

# Phase 5 Plan 02 Summary

**Events page media UX:** A collapsible **Media capture** section with independent Start/Stop for mic and camera, level meter, live `<video>` preview, and `events-error` alerts — wired to `useMediaCapture` and covered by tests using `GlobalWindow`.

## Performance

- **Duration:** ~20 min
- **Tasks:** 2

## Task Commits

1. **Task 1: MediaCaptureSection + styles + tests** — `710e41a` (feat)
2. **Task 2: EventsScreen integration** — `27f98b1` (feat)

## Verification

- `bun test` — pass (full suite)

## Self-Check: PASSED

## Deviations

- None.
