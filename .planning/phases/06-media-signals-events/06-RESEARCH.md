# Phase 06: media-signals-events - Research

**Researched:** 2026-04-15  
**Domain:** Browser media classification to orchestrator event ingestion  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use **Google MediaPipe** (browser Tasks / WASM) for **both** modalities: **audio classification** and **video classification** (or the closest officially supported tasks that provide class labels/scores for each stream). Raw RMS-only gating may be used as a **supplementary** gate or for UI, but **posting** `POST /events` for media activity should be **driven by MediaPipe outputs** (plus throttling), not by ad-hoc volume thresholds alone.
- **D-02:** **Video path** must still **meet the roadmap pattern**: frames reach MediaPipe via a **documented, inspectable** flow (e.g. periodic `canvas` / `ImageBitmap` / `HTMLVideoElement` sampling aligned with `useMediaCapture`’s camera preview). Comments should explain how often frames are classified and how results map to events.
- **D-03:** **Independent throttles** per modality so one cannot starve the other:
  - **Audio-derived** `POST /events`: minimum **3 seconds** between successful posts while activity continues (per home / per client session).
  - **Video-derived** `POST /events`: minimum **4 seconds** between successful posts under the same conditions.
- **D-04:** Throttling applies to **accepted** posts (after MediaPipe indicates meaningful classification activity). Fine-tuning the exact clock (monotonic timestamps, coalescing) is implementation detail.
- **D-05:** Stable string **`event_type`** values:
  - Audio-derived: **`media.audio`**
  - Video-derived: **`media.video`**
- **D-06:** Optional **`body`** is JSON-friendly and holds **classifier-oriented** fields for inspectability, e.g. top label/category, score or confidence, and optionally a small list of top candidates — exact field names live in a **single shared module** (alongside comments) so the pipeline stays grep-friendly. Use **`JSON.stringify`-safe** values only.

### Claude's Discretion
- Choice of **specific MediaPipe task models** (audio vs video), lazy vs eager loading, and bundle-size mitigations (dynamic import, etc.).
- **Score / confidence thresholds** below which events are suppressed (to reduce noise), as long as MEDIA-03/MEDIA-04 remain satisfiable with tests or documented behavior.
- Error handling when MediaPipe fails to initialize (user-visible message vs silent degradation) — prefer **non-silent** failure consistent with Phase 5 media error patterns where reasonable.
- Any **supplementary** RMS/visual meter logic left over from Phase 5 stays **orthogonal** to event posting unless needed for gating.

### Deferred Ideas (OUT OF SCOPE)
- **Phase 7**: E2E confirmation that media rows appear in the React Events list with the same visibility rules as other sources.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEDIA-03 | Audio-derived activity produces throttled `POST /events` using locked `PostEventBody`. | Reuse `PostEventBody` contract, add client `postEvent` helper, run AudioClassifier-driven gate + 3s throttle + JSON-safe `body`. |
| MEDIA-04 | Video-derived activity produces `POST /events` with same contract and documented activity pattern. | Use documented inspectable frame sampling from `videoRef` into MediaPipe vision task + 4s throttle + centralized event naming/body schema. |
</phase_requirements>

## Project Constraints (from .cursor/rules/)

- Use Bun as runtime/tooling (`bun run`, `bun test`, `bun add`) rather than npm scripts for project execution. [VERIFIED: .cursor/rules/gsd-project.md]
- Keep implementation explicit and readable over clever abstractions or hidden pipelines. [VERIFIED: .cursor/rules/gsd-project.md]
- Preserve TypeScript strict-mode compatibility (`strict`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `noImplicitOverride`). [VERIFIED: tsconfig.json]
- Keep edits within GSD workflow conventions and phase artifacts under `.planning/phases/06-media-signals-events/`. [VERIFIED: .cursor/rules/gsd-project.md]

## Summary

Phase 6 should be implemented as a client-side "media signal pipeline" that consumes existing capture streams from `useMediaCapture`, classifies audio/video with MediaPipe Tasks, and emits throttled event posts through the existing `/events` contract used by the orchestrator. `PostEventBody` is already stable (`home_id`, `event_type`, optional `body`) and server-side parsing/insert paths are already in place for arbitrary event types, so this phase is primarily about safe signal-to-event mapping and request-rate control rather than backend schema changes. [VERIFIED: src/client/hooks/use-media-capture.ts] [VERIFIED: src/types/events-api.ts] [VERIFIED: src/routes/events.ts]

The highest planning risk is browser networking behavior: current orchestrator CORS headers advertise only `GET, OPTIONS` for `/events`, while Phase 6 requires browser-originated `POST /events` from the client dev server origin. Planning should include explicit CORS/preflight adjustments for POST, or local same-origin serving as an alternative. [VERIFIED: src/server.ts] [CITED: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Methods]

Graph context was unavailable (`.planning/graphs/graph.json` missing), so all dependency mapping is based on direct codebase inspection and external docs. [VERIFIED: local graph check]

**Primary recommendation:** Implement a dedicated client module that owns (1) MediaPipe lifecycle, (2) per-modality throttles, and (3) typed `postEvent` emission with centralized `media.audio` / `media.video` naming and JSON-safe classifier metadata.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Audio signal classification | Browser / Client | — | Microphone stream and AudioContext already live in browser hook; classification must happen on client media stream. [VERIFIED: src/client/hooks/use-media-capture.ts] |
| Video signal classification | Browser / Client | — | Camera preview `videoRef` is browser-local and must be sampled in-client for inspectable frame path. [VERIFIED: src/client/hooks/use-media-capture.ts] |
| Event payload construction (`PostEventBody`) | Browser / Client | API / Backend | Client assembles payload; backend validates and stores. [VERIFIED: src/types/events-api.ts] [VERIFIED: src/routes/events.ts] |
| Event ingestion and persistence | API / Backend | Database / Storage | `/events` POST parsing, DB insert, and fan-out live in orchestrator route. [VERIFIED: src/routes/events.ts] |
| Flood prevention (throttle policy) | Browser / Client | API / Backend | Requirement is client-side emission throttling before POST; backend currently accepts valid posts without rate limit. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: src/routes/events.ts] |
| Development cross-origin access | API / Backend | Browser / Client | Orchestrator must satisfy CORS preflight/headers for browser POST from client server origin. [VERIFIED: src/server.ts] [CITED: https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mediapipe/tasks-audio` | `0.10.34` (modified 2026-03-23) | Browser audio classification from mic stream | Official MediaPipe Tasks package and documented `FilesetResolver.forAudioTasks` + `AudioClassifier` flow. [VERIFIED: npm registry] [CITED: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/audio/README.md] |
| `@mediapipe/tasks-vision` | `0.10.34` (modified 2026-03-23) | Browser vision classification/detection from sampled video frames | Official MediaPipe Tasks package and documented `FilesetResolver.forVisionTasks` + vision task creation flow. [VERIFIED: npm registry] [CITED: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md] |
| Built-in `fetch` + existing client API pattern | Bun 1.3.8 runtime | `POST /events` using existing HTTP style | Existing project already centralizes event fetching with validation patterns suitable for parallel `postEvent` helper. [VERIFIED: src/client/api/events-client.ts] [VERIFIED: package.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Browser `AudioContext` / `AnalyserNode` | Web API | Stream access and optional local signal metrics | Keep for supplementary UX/debug meters; do not use as sole event trigger. [VERIFIED: src/client/hooks/use-media-capture.ts] [VERIFIED: .planning/phases/06-media-signals-events/06-CONTEXT.md] |
| Existing media error formatter | local module | User-facing capture/init failure messaging | Reuse for MediaPipe initialization failures to keep non-silent UX. [VERIFIED: src/client/lib/media-errors.ts] [VERIFIED: .planning/phases/06-media-signals-events/06-CONTEXT.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MediaPipe Tasks for both modalities | RMS threshold only / frame-diff only | Conflicts with locked decision D-01 requiring classifier-driven posting. [VERIFIED: .planning/phases/06-media-signals-events/06-CONTEXT.md] |
| `ImageClassifier` for video labels | `ObjectDetector` / `GestureRecognizer` from tasks-vision | Better task fit for motion/gesture domains may exist, but all remain within locked MediaPipe family; exact task choice is discretionary. [CITED: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md] |

**Installation (project constraint uses Bun):**
```bash
bun add @mediapipe/tasks-audio @mediapipe/tasks-vision
```

**Version verification commands run:**
```bash
npm view @mediapipe/tasks-audio version time --json
npm view @mediapipe/tasks-vision version time --json
```

## Architecture Patterns

### System Architecture Diagram

```text
Mic stream ----\
                -> MediaPipe Audio task -> audio score/label gate -> audio throttle (3s) -> postEvent() -> POST /events
Camera stream -> sampled frames ---------> MediaPipe Vision task -> video score/label gate -> video throttle (4s) -> postEvent() -> POST /events

postEvent() -> shared payload builder (home_id + event_type + body schema)
POST /events -> parse/validate -> SQLite insert -> fan-out to subscribers
```

### Recommended Project Structure

```text
src/client/
├── api/
│   └── events-client.ts        # add postEvent alongside fetchEvents
├── lib/
│   ├── media-event-types.ts    # centralized media.audio / media.video + body shape helpers
│   ├── media-throttle.ts       # per-modality throttle bookkeeping
│   └── media-signals.ts        # MediaPipe init + classify loops + emit callback
└── hooks/
    └── use-media-capture.ts    # remains stream owner and exposes refs/active state
```

### Pattern 1: Explicit Signal Pipeline
**What:** Build one function per modality: `classifyAudioAndMaybeEmit()` and `classifyVideoAndMaybeEmit()`, both calling shared `emitMediaEvent(kind, classification)` utility. [VERIFIED: phase design requirement]
**When to use:** Whenever a classifier result is available and threshold passes.
**Example:**
```typescript
// Source: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/audio/README.md
const audio = await FilesetResolver.forAudioTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio/wasm");
const audioClassifier = await AudioClassifier.createFromModelPath(audio, modelUrl);
const classifications = audioClassifier.classify(audioData);
```

### Pattern 2: Inspectable Video Sampling Loop
**What:** Use `videoRef.current` with a fixed interval (`setInterval` or animation loop with min delta) and annotate cadence in comments.
**When to use:** While camera is active and classifier initialized.
**Example:**
```typescript
// Source: locked D-02 + MediaPipe web vision usage
if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
  // sample every N ms (documented), classify current frame, emit if threshold + throttle pass
}
```

### Pattern 3: Shared Payload Builder
**What:** Single helper that maps modality result to `PostEventBody`.
**When to use:** For every emitted media event to avoid schema drift.
**Example:**
```typescript
// Source: src/types/events-api.ts
const payload: PostEventBody = { home_id, event_type: "media.audio", body: safeBody };
```

### Anti-Patterns to Avoid

- **Global throttle across both modalities:** violates locked independent throttle policy and can starve one signal path. [VERIFIED: .planning/phases/06-media-signals-events/06-CONTEXT.md]
- **Posting directly from UI component handlers:** hides domain logic in view layer and makes tests harder; keep pipeline in dedicated lib/api modules. [VERIFIED: src/client/media-capture-section.tsx]
- **Uncommented frame loop magic numbers:** fails inspectability requirement for video path cadence and mapping. [VERIFIED: .planning/phases/06-media-signals-events/06-CONTEXT.md]
- **Cross-origin POST without preflight support:** browser requests fail despite valid server route. [VERIFIED: src/server.ts] [CITED: https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio/vision inference kernels | Custom DSP/ML loop for core classification | MediaPipe Tasks (`tasks-audio`, `tasks-vision`) | Inference model loading + WASM runtime + task APIs are already standardized and locked by decision. [VERIFIED: .planning/phases/06-media-signals-events/06-CONTEXT.md] [CITED: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md] |
| Event contract parsing assumptions | Ad-hoc payload shape in multiple files | Shared `PostEventBody` type + single payload builder module | Prevents mismatch across audio/video emitters and keeps grep-friendly naming. [VERIFIED: src/types/events-api.ts] |
| CORS protocol interpretation | Trial-and-error browser behavior hacks | Explicit OPTIONS + consistent CORS headers for intended methods | Preflight behavior is deterministic and should be handled once in server route layer. [CITED: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Methods] |

**Key insight:** This phase should hand-roll only the domain mapping (classifier result -> semantic event), not the inference/runtime plumbing or HTTP contract primitives.

## Common Pitfalls

### Pitfall 1: Browser POST blocked by CORS preflight
**What goes wrong:** `POST /events` from the client fails in browser despite server route existing. [VERIFIED: src/server.ts]  
**Why it happens:** Current CORS helper only advertises `GET, OPTIONS`, and POST responses are not wrapped with CORS headers. [VERIFIED: src/server.ts]  
**How to avoid:** Extend allowed methods to include POST and return matching CORS headers for POST/OPTIONS responses on `/events`. [CITED: https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request]  
**Warning signs:** Browser console shows CORS/preflight errors; network tab shows failing OPTIONS request.

### Pitfall 2: Flooding orchestrator during sustained signal
**What goes wrong:** Continuous mic/video activity emits too many events and pollutes DB/fan-out. [VERIFIED: .planning/REQUIREMENTS.md]  
**Why it happens:** Missing or shared throttle state, or throttle measured before acceptance.
**How to avoid:** Keep separate `lastPostedAt` clocks for audio and video, update only on accepted posts, and enforce 3s/4s minima from locked decisions. [VERIFIED: .planning/phases/06-media-signals-events/06-CONTEXT.md]  
**Warning signs:** Rapidly increasing `/events` rows while holding constant input.

### Pitfall 3: Non-serializable `body` payloads
**What goes wrong:** Unexpected payload values break JSON serialization or become lossy noise.
**Why it happens:** Passing raw classifier objects or typed arrays directly.
**How to avoid:** Normalize to plain JSON-safe fields (`top_label`, `score`, optional top-N array of plain values). [VERIFIED: .planning/phases/06-media-signals-events/06-CONTEXT.md]  
**Warning signs:** `TypeError` during `JSON.stringify` or opaque huge payload blobs.

### Pitfall 4: MediaPipe lifecycle leaks
**What goes wrong:** CPU usage climbs or duplicate classifications continue after stop/unmount.
**Why it happens:** Interval/task instances not closed when mic/camera deactivate.
**How to avoid:** Couple classifier startup/teardown to capture active state and component cleanup similar to existing stream teardown discipline. [VERIFIED: src/client/hooks/use-media-capture.ts]  
**Warning signs:** Classifier callbacks continue after stopping camera/mic.

## Code Examples

Verified patterns from official sources:

### Audio classifier initialization
```typescript
// Source: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/audio/README.md
const audio = await FilesetResolver.forAudioTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio/wasm");
const audioClassifier = await AudioClassifier.createFromModelPath(
  audio,
  "https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite",
);
const classifications = audioClassifier.classify(audioData);
```

### Vision classifier initialization
```typescript
// Source: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md
const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
const imageClassifier = await ImageClassifier.createFromModelPath(
  vision,
  "https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite",
);
const classifications = imageClassifier.classify(imageElement);
```

### Existing project POST contract
```typescript
// Source: src/types/events-api.ts
export type PostEventBody = {
  home_id: number;
  event_type: string;
  body?: unknown;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad-hoc RMS/frame heuristics only | Task-based on-device classification (MediaPipe Tasks Web) | Tasks packages matured through current 0.10.x line | Better semantic labeling and consistent confidence outputs for inspectable event payloads. [CITED: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md] |
| Monolithic UI-triggered event actions | Dedicated signal-processing modules + typed API clients | Modern frontend architecture practice | Easier testing and lower coupling between UI and transport logic. [ASSUMED] |

**Deprecated/outdated:**
- Relying only on MediaPipe "Solutions" script tags for new implementations is less maintainable than package-based Tasks integration in modern bundlers. [CITED: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ImageClassifier` is sufficient for "video-derived activity" semantics in this product context. | Standard Stack / Patterns | May produce weak/noisy activity signals; planner may need to pick object/gesture task instead. |
| A2 | Adding CORS headers for POST is the preferred fix versus same-origin serving changes. | Common Pitfalls | If architecture instead moves to same-origin, extra CORS work is unnecessary. |

## Open Questions (RESOLVED)

1. **Which specific vision task gives the best activity signal for this UI?**
   - Resolution: Use `ImageClassifier` as the default Phase 6 baseline because it gives deterministic label/score outputs that map cleanly to `media.video` event bodies while keeping integration complexity low for this phase.
   - Follow-up: Keep the pipeline abstraction task-agnostic so `ObjectDetector` or `GestureRecognizer` can replace the classifier in a later phase without changing event contract shape.

2. **Should client POST path be validated with unit-only tests or include local integration checks in Phase 6?**
   - Resolution: Include both unit tests and at least one local integration assertion in Phase 6 for `POST /events` behavior (including CORS/preflight expectations), while keeping UI list rendering confirmation deferred to Phase 7.
   - Follow-up: Keep integration scope focused on transport contract and throttled emission behavior, not full UI rendering workflows.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun runtime | project scripts/tests | ✓ | 1.3.8 | — |
| Node runtime | `gsd-tools` + ecosystem CLIs | ✓ | v22.14.0 | — |
| npm registry access | package/version verification | ✓ | npm 11.11.1 | `bun add` still used for install in project |
| MediaPipe packages in repo | Phase 6 implementation | ✗ (not installed yet) | — | Add during implementation (`bun add`) |

**Missing dependencies with no fallback:**
- None identified.

**Missing dependencies with fallback:**
- MediaPipe packages are missing from current `package.json`; install is straightforward and planned.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `bun:test` (Bun 1.3.8) |
| Config file | none — uses Bun defaults |
| Quick run command | `bun test src/client/api/events-client.test.ts src/client/hooks/use-media-capture.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEDIA-03 | Audio classification path emits valid throttled `POST /events` payload | unit + integration | `bun test src/client/lib/media-signals-audio.test.ts src/client/api/events-client.post.test.ts` | ❌ Wave 0 |
| MEDIA-04 | Video sampling/classification path emits valid throttled `POST /events` payload | unit + integration | `bun test src/client/lib/media-signals-video.test.ts src/orchestrator.integration.test.ts` | ❌ Wave 0 (new client tests) |

### Sampling Rate

- **Per task commit:** `bun test src/client/lib/media-signals-*.test.ts`
- **Per wave merge:** `bun test`
- **Phase gate:** full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/client/lib/media-signals-audio.test.ts` — covers MEDIA-03 throttle + payload mapping
- [ ] `src/client/lib/media-signals-video.test.ts` — covers MEDIA-04 sampling + throttle + payload mapping
- [ ] `src/client/api/events-client.post.test.ts` — verifies `postEvent` request method/url/body/error handling
- [ ] CORS route assertion in orchestrator tests for OPTIONS/POST behavior

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Lab orchestrator currently has no auth boundary for this flow. [VERIFIED: src/server.ts] |
| V3 Session Management | no | No session issuance/validation in media-event pipeline. [VERIFIED: src/server.ts] |
| V4 Access Control | partial | Home scoping enforced by `home_id` existence check on POST. [VERIFIED: src/routes/events.ts] |
| V5 Input Validation | yes | `parsePostEventBody` validates types before insert; client should mirror contract types. [VERIFIED: src/routes/events.ts] [VERIFIED: src/types/events-api.ts] |
| V6 Cryptography | no | No cryptographic processing introduced in this phase. [VERIFIED: phase scope] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Event spam / accidental DoS from client loops | Denial of Service | Enforce independent modality throttles + confidence gating before POST. [VERIFIED: .planning/phases/06-media-signals-events/06-CONTEXT.md] |
| Cross-origin request failure leading to insecure quick fixes | Tampering | Implement explicit CORS policy for required methods/headers, not wildcard hacks. [VERIFIED: src/server.ts] [CITED: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Methods] |
| Unsafe rendering of `body` fields in UI | XSS | Continue React text-node rendering/JSON-stringify rule from existing client API comments. [VERIFIED: src/client/api/events-client.ts] |

## Sources

### Primary (HIGH confidence)

- `/google-ai-edge/mediapipe` (Context7 CLI) — MediaPipe web tasks setup snippets for audio and vision (`FilesetResolver`, task creation APIs).
- npm registry (`npm view`) — latest versions and publish timeline for `@mediapipe/tasks-audio` and `@mediapipe/tasks-vision`.
- Local codebase files:
  - `src/client/hooks/use-media-capture.ts`
  - `src/client/api/events-client.ts`
  - `src/types/events-api.ts`
  - `src/routes/events.ts`
  - `src/server.ts`
  - `.planning/phases/06-media-signals-events/06-CONTEXT.md`
  - `.planning/REQUIREMENTS.md`

### Secondary (MEDIUM confidence)

- [MDN Access-Control-Allow-Methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Methods) (browser CORS preflight behavior).
- [MDN Preflight request](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request).

### Tertiary (LOW confidence)

- WebSearch snippets on `runningMode: "VIDEO"` / `classifyForVideo` usage (not directly fetched from official page due timeout).

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — package versions + official MediaPipe task docs are verified.
- Architecture: **MEDIUM** — codebase mapping is clear, but exact vision task choice remains discretionary.
- Pitfalls: **MEDIUM** — CORS/throttle risks are concrete; performance thresholds depend on implementation details.

**Research date:** 2026-04-15  
**Valid until:** 2026-05-15 (re-check MediaPipe docs/packages if planning starts later)

## RESEARCH COMPLETE
