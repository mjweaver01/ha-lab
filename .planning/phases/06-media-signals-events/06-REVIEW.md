---
phase: 06-media-signals-events
reviewed: 2026-04-15T19:49:55Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/client/lib/media-event-types.ts
  - src/client/api/events-client.ts
  - src/client/api/events-client.post.test.ts
  - src/client/lib/media-throttle.ts
  - src/client/lib/media-throttle.test.ts
  - src/client/lib/media-signals.ts
  - src/client/lib/media-signals-audio.test.ts
  - src/client/lib/media-signals-video.test.ts
  - src/client/hooks/use-media-capture.ts
  - src/client/hooks/use-media-capture.test.ts
  - src/client/media-capture-section.tsx
  - src/server.ts
  - src/orchestrator.integration.test.ts
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-04-15T19:49:55Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed all source files changed by Phase 06 plan execution, including the media event contract, signal pipeline, capture hook wiring, and `/events` CORS server path with integration tests. No security-critical issues were found, but there is one behavioral regression risk in camera signaling plus two test coverage gaps that can allow regressions to slip through.

## Warnings

### WR-01: Camera emits accepted video events even when no frame data exists

**File:** `src/client/hooks/use-media-capture.ts:224-225`
**Issue:** The camera sampling loop sets score to `0.8` when `hasVideoData` is false, and pipeline default threshold is `0.65`. This means the hook can emit accepted `media.video` events with label `"still"` even when no usable frame data exists, generating false-positive event traffic.
**Fix:**
```typescript
const hasVideoData =
  (videoRef.current?.videoWidth ?? 0) > 0 && (videoRef.current?.videoHeight ?? 0) > 0;
const score = hasVideoData ? 0.9 : 0;
const label = hasVideoData ? VIDEO_ACTIVE_LABEL : VIDEO_IDLE_LABEL;
```

### WR-02: Normalization contract in media-event-types has no direct unit tests

**File:** `src/client/lib/media-event-types.ts:16-83`
**Issue:** `clampScore`, `trimLabel`, and candidate normalization are core contract logic used by both audio/video event bodies, but there is no dedicated test file asserting clamping, trimming, non-finite score handling, or `"unknown"` fallback behavior.
**Fix:**
```typescript
// src/client/lib/media-event-types.test.ts
test("buildAudioEventBody normalizes labels and clamps scores", () => {
  const body = buildAudioEventBody("  ", Number.NaN, [{ label: " person ", score: 1.5 }]);
  expect(body.top_label).toBe("unknown");
  expect(body.top_score).toBe(0);
  expect(body.candidates?.[0]).toEqual({ label: "person", score: 1 });
});
```

## Info

### IN-01: postEvent input validation paths are not explicitly test-covered

**File:** `src/client/api/events-client.ts:114-116`
**Issue:** `postEvent` validates `home_id` and trims/validates `event_type`, but tests currently cover only transport success/failure. A future refactor could weaken validation without failing tests.
**Fix:** Add targeted tests that assert rejection for non-integer `home_id` and blank/whitespace-only `event_type`.

---

_Reviewed: 2026-04-15T19:49:55Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
