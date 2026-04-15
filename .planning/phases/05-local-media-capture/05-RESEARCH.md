# Phase 5 — Technical Research: Local media capture

**Researched:** 2026-04-15  
**Phase:** Local media capture (browser `getUserMedia` + React)

## Summary

Implement **microphone** and **camera** capture in the existing Bun + React client using **`navigator.mediaDevices.getUserMedia`**, **independent** tracks per CONTEXT **D-02**, with **Web Audio** `AnalyserNode` for a visible mic level meter and a **`<video>`** element for camera preview per **D-03**. Permission and runtime failures must surface through **`DOMException`** names (`NotAllowedError`, `NotFoundError`, `NotReadableError`) and **`track.onended`** (revocation) with **no silent failure** per **D-04** / **D-05**. Phase 5 **does not** POST to `/events` (Phase 6).

**Confidence:** HIGH for API shape; MEDIUM for exact browser quirks (Safari vs Chrome) — manual verification required.

---

## User Constraints (from CONTEXT.md)

| ID | Constraint |
|----|------------|
| D-01 | Collapsible labeled section for media controls |
| D-02 | Independent mic and camera start/stop |
| D-03 | Mic: status + level meter; Camera: status + small live preview |
| D-04 / D-05 | Inline `role="alert"` errors; name device + remediation (browser + macOS Settings) |

---

## Phase Requirements

| ID | Text |
|----|------|
| MEDIA-01 | Mic start/stop; denied/dismissed/revoked → clear message |
| MEDIA-02 | Camera start/stop; same error behavior as mic |

---

## Standard Stack

| Piece | Choice | Notes |
|-------|--------|-------|
| Capture API | `navigator.mediaDevices.getUserMedia` | Requires [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts); `localhost` qualifies [CITED: MDN Secure Contexts] |
| Audio analysis | `AudioContext` + `AudioNode` graph + `AnalyserNode` | RMS via `getByteTimeDomainData` or frequency data; [ASSUMED] `fftSize` 2048–4096 is reasonable for a simple meter |
| Video preview | `<video>` + `srcObject = stream` | `muted`, `playsInline`, `autoplay` for autoplay policies [CITED: MDN HTMLMediaElement] |
| React integration | Hook + cleanup in `useEffect` | Stop tracks, disconnect audio nodes, close `AudioContext` on unmount/stop [ASSUMED] |
| Tests | `bun:test` + `happy-dom` / `@testing-library/react` | Mock `navigator.mediaDevices` and `MediaStream` [VERIFIED: repo uses bun test + happy-dom in package.json] |

---

## Architecture Patterns

1. **Single hook** (e.g. `useMediaCapture`) exposing: `micActive`, `cameraActive`, `micLevel` (0–1 or 0–255), `micError`, `cameraError`, `startMic`, `stopMic`, `startCamera`, `stopCamera`, `videoRef` binding for preview.
2. **Pure helpers** in `src/client/lib/media-errors.ts` mapping `DOMException` / `Error` name + device kind → user-facing string (testable without browser).
3. **UI component** (`MediaCaptureSection` or inline) consumed by `EventsScreen` — keeps `events-screen.tsx` readable.

---

## Common Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| `getUserMedia` requires user gesture | Attach start to **click** handlers; do not call on mount [CITED: MDN getUserMedia] |
| Forgotten track stop | `stream.getTracks().forEach(t => t.stop())` on stop and unmount |
| `AudioContext` suspended | `await audioContext.resume()` after user gesture [CITED: MDN AudioContext] |
| Camera light stays on | Ensure video track stopped when camera “off” |
| Revoked permission while running | Listen to `track.onended` and set error state + UI [ASSUMED] |

---

## Validation Architecture

**Nyquist:** Automated tests run after each task; full `bun test` after each wave. Manual browser checks required for **real** permission prompts and OS revoke.

| Dimension | Approach |
|-----------|----------|
| Unit | `formatMediaError(...)` or equivalent — deterministic strings for `NotAllowedError`, `NotFoundError`, device kind |
| Hook / component | Mock `globalThis.navigator.mediaDevices`; assert start/stop transitions and error state |
| Manual | Deny mic/camera in browser; revoke in macOS Privacy; confirm UI shows **Media capture** errors with remediation text per UI-SPEC |

---

## Security Domain

| Topic | Assessment |
|-------|------------|
| Data flow | Streams stay **in-browser**; no upload in Phase 5 |
| XSS | React default escaping; no `dangerouslySetInnerHTML` |
| Privacy | User explicitly starts capture; no background recording |

**STRIDE (lab scope):**

| Threat | Notes |
|--------|-------|
| Spoofing | N/A — no server trust claim in this phase |
| Tampering | Client-only state; orchestrator unchanged |
| **Information disclosure** | **Mitigate** — do not log raw media or stream URLs to console in production code paths; lab may use minimal debug behind `import.meta` guard if needed |
| Denial of service | N/A |
| Elevation | N/A |

---

## Sources

- MDN: `MediaDevices.getUserMedia`, `AnalyserNode`, `AudioContext`, `<video>` `srcObject`
- Project: `.planning/phases/05-local-media-capture/05-CONTEXT.md`, `05-UI-SPEC.md`  
- Project stack: `.planning/research/STACK.md`

---

## RESEARCH COMPLETE
