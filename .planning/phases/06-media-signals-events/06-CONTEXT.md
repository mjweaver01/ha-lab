# Phase 6: Media signals → events - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

**Audio- and video-derived** activity results in **throttled** `POST /events` to the orchestrator using the locked **`PostEventBody`** shape (`home_id`, `event_type`, optional `body`). Signals are driven by **Google MediaPipe** classification on both **audio** and **video** paths (user preference from prior experience). Video still follows an **inspectable browser pattern** (e.g. periodic frames from the existing camera preview into MediaPipe), not a black-box stream. Naming for audio vs video `event_type` / `body` is **centralized and documented in code**. This phase does **not** include E2E confirmation in the Events list — that is **Phase 7**.

</domain>

<decisions>
## Implementation Decisions

### MediaPipe as the signal source
- **D-01:** Use **Google MediaPipe** (browser Tasks / WASM) for **both** modalities: **audio classification** and **video classification** (or the closest officially supported tasks that provide class labels/scores for each stream). Raw RMS-only gating may be used as a **supplementary** gate or for UI, but **posting** `POST /events` for media activity should be **driven by MediaPipe outputs** (plus throttling), not by ad-hoc volume thresholds alone.
- **D-02:** **Video path** must still **meet the roadmap pattern**: frames reach MediaPipe via a **documented, inspectable** flow (e.g. periodic `canvas` / `ImageBitmap` / `HTMLVideoElement` sampling aligned with `useMediaCapture`’s camera preview). Comments should explain how often frames are classified and how results map to events.

### Throttling
- **D-03:** **Independent throttles** per modality so one cannot starve the other:
  - **Audio-derived** `POST /events`: minimum **3 seconds** between successful posts while activity continues (per home / per client session).
  - **Video-derived** `POST /events`: minimum **4 seconds** between successful posts under the same conditions.
- **D-04:** Throttling applies to **accepted** posts (after MediaPipe indicates meaningful classification activity). Fine-tuning the exact clock (monotonic timestamps, coalescing) is implementation detail.

### `event_type` and `body` conventions
- **D-05:** Stable string **`event_type`** values:
  - Audio-derived: **`media.audio`**
  - Video-derived: **`media.video`**
- **D-06:** Optional **`body`** is JSON-friendly and holds **classifier-oriented** fields for inspectability, e.g. top label/category, score or confidence, and optionally a small list of top candidates — exact field names live in a **single shared module** (alongside comments) so the pipeline stays grep-friendly. Use **`JSON.stringify`-safe** values only.

### Claude's Discretion
- Choice of **specific MediaPipe task models** (audio vs video), lazy vs eager loading, and bundle-size mitigations (dynamic import, etc.).
- **Score / confidence thresholds** below which events are suppressed (to reduce noise), as long as MEDIA-03/MEDIA-04 remain satisfiable with tests or documented behavior.
- Error handling when MediaPipe fails to initialize (user-visible message vs silent degradation) — prefer **non-silent** failure consistent with Phase 5 media error patterns where reasonable.
- Any **supplementary** RMS/visual meter logic left over from Phase 5 stays **orthogonal** to event posting unless needed for gating.

### Folded Todos
_None._

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope and contract
- `.planning/ROADMAP.md` — Phase 6 goal, success criteria, MEDIA-03 / MEDIA-04.
- `.planning/REQUIREMENTS.md` — **MEDIA-03**, **MEDIA-04** (throttled POST, same contract).
- `src/types/events-api.ts` — **`PostEventBody`** lock.

### Prior phase context
- `.planning/phases/05-local-media-capture/05-CONTEXT.md` — Capture UX, independent mic/camera, `useMediaCapture` integration points.

### MediaPipe (external — verify current package names in research)
- [MediaPipe for Web](https://developers.google.com/mediapipe/solutions/guide) — browser Tasks, WASM, audio and vision solutions.

### Implementation touchpoints
- `src/client/hooks/use-media-capture.ts` — Live mic (incl. analyser) and camera preview streams for feeding MediaPipe.
- `src/client/hooks/use-events-poll.ts` / `src/client/lib/public-env.ts` — **`home_id`** and orchestrator **base URL** for POSTs (same as GET).
- `scripts/simulated-node.ts` — Reference for **`PostEventBody`** POST shape and URL construction patterns.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useMediaCapture`**: Provides mic/camera streams, mic level, `videoRef` for preview — integration point for feeding **audio** into MediaPipe and **video frames** on a cadence.
- **`events-client.ts`**: Today **GET only**; Phase 6 adds a **`postEvent`** (or equivalent) using the same base URL + `home_id` discipline as polling.

### Established Patterns
- **Simulated node** validates orchestrator POST expectations; client POST should mirror that contract.
- **Phase 5** errors: inline alerts for user-visible failures — align MediaPipe init failures where applicable.

### Integration Points
- New module(s) under `src/client/` for MediaPipe lifecycle, throttles, and **`postEvent`**; consumed from the same tree as **`EventsScreen`** / **`useMediaCapture`** (exact split is planner’s choice).
- **Bundle weight**: MediaPipe WASM/tasks are non-trivial — plan for loading strategy and dev-server behavior with Bun HTML bundler.

</code_context>

<specifics>
## Specific Ideas

- User has **prior experience with MediaPipe** and wants it used for **classifying both video and audio** (not only classical DSP/canvas heuristics).
- User deferred **throttle numbers** and **`event_type`/`body` naming** to implementation defaults — locked above as **D-03–D-06**.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 7**: E2E confirmation that media rows appear in the React Events list with the same visibility rules as other sources.

### Reviewed Todos (not folded)
_None._

</deferred>

---

*Phase: 06-media-signals-events*
*Context gathered: 2026-04-15*
