---
status: passed
phase: 05-local-media-capture
verified: 2026-04-15
---

# Phase 5 verification — Local media capture

## Goal (ROADMAP)

Users can start/stop microphone and camera with obvious running state and clear errors when permissions are denied, dismissed, or revoked — **capture and UX only** (no `POST /events` in this phase).

## Requirement traceability

| ID | Evidence |
|----|----------|
| MEDIA-01 | `useMediaCapture` + `MediaCaptureSection`: mic start/stop, meter when on, `formatMediaError` / `formatTrackEndedMessage`; tests for blocked path |
| MEDIA-02 | Same for camera + `<video>` preview; parallel error handling |

## Must-haves (from plans)

| Criterion | Result |
|-----------|--------|
| Error strings for denied / not-found / unreadable (UI-SPEC) | **Pass** — `media-errors.ts` + tests |
| Independent mic/camera; tracks stopped on stop/unmount | **Pass** — hook implementation + tests |
| Mic level [0,1] while active | **Pass** — AnalyserNode loop |
| Media capture UI: collapsible, labels, status, meter, video max-height, `events-error` + `role="alert"` | **Pass** — component + tests |
| Events page integration | **Pass** — `EventsScreen` after meta, before toolbar |

## Automated checks

- `bun test` — all green (repository-wide)

## Human verification (recommended)

OS/browser permission prompts cannot be asserted in CI. After `bun run client`, manually confirm: expand **Media capture**, start/stop mic and camera, and observe permission or error messaging in the UI.

## Conclusion

Phase 5 implementation satisfies the documented plans and roadmap success criteria for capture UX; Phase 6 will add signal → `POST /events`.
