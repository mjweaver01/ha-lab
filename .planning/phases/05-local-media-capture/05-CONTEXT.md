# Phase 5: Local media capture - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can start and stop **microphone** and **camera** capture in the React client (`getUserMedia`), with **unambiguous** active vs inactive state and **no silent failure** when permissions are denied, dismissed, or revoked. This phase delivers **capture and UX only** — wiring audio/video signals to `POST /events` is **Phase 6**; end-to-end trace in the Events list is **Phase 7**.

</domain>

<decisions>
## Implementation Decisions

### Placement on the Events screen
- **D-01:** Mic/camera controls live in a **collapsible** section: a **labeled header** (e.g. “Media” or “Media capture”) that **expands** to reveal start/stop controls and status. Collapsed by default vs expanded is **Claude’s discretion** (see below); the section must remain discoverable when collapsed (clear label, affordance to expand).

### Mic vs camera control model
- **D-02:** **Independent** controls: separate **start/stop** (or equivalent toggles) for **microphone** and **camera**, so each device can be on or off independently.

### Running state and preview
- **D-03:** When capture is active, state must be **obvious** (not ambiguous):
  - **Microphone on:** show **status** (e.g. “Mic: on” / capturing) plus a **simple level meter** (or equivalent visual activity indicator) derived from the live stream **without** implementing Phase 6 event posting.
  - **Camera on:** show **status** plus a **small live video preview** (`<video>` bound to the camera track) so the user sees the camera is live.
  - **Off:** clear “off” / idle state for each device when stopped.

### Permission and error messaging
- **D-04:** On **denied**, **dismissed**, or **revoked** permissions (or other `getUserMedia` / `NotAllowedError` / `NotFoundError` failures), show a **custom inline alert** using the same **visual family** as existing client errors (`role="alert"`, panel styling consistent with `events-error` / load errors).
- **D-05:** Copy must include **what failed** (which device or permission) and a **short remediation hint** (e.g. browser site permissions, macOS **System Settings → Privacy & Security** for camera/microphone). No silent failure.

### Claude's Discretion
- Default **expanded vs collapsed** for the media section on first load; animation for expand/collapse; exact dimensions of video preview and level meter; implementation of the meter (e.g. `AnalyserNode` + RMS) as long as behavior matches **D-03** and **D-04** / **D-05**.
- Exact button labels (“Start” / “Stop” vs “Enable” / “Disable”) matching existing Events UI tone.

### Folded Todos
_None — no todos were folded into this phase._

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope and requirements
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria, dependency on Phase 4 (v1.0 client).
- `.planning/REQUIREMENTS.md` — **MEDIA-01** (mic start/stop + permission handling), **MEDIA-02** (camera + same permission behavior).

### Product and stack
- `.planning/PROJECT.md` — v1.1 browser-first capture, lab constraints (Bun, React, no native mobile).

### Research (non-normative; aligns with roadmap)
- `.planning/research/ARCHITECTURE.md` — `getUserMedia` → `MediaStream`, secure context / user gesture notes for lab.
- `.planning/research/STACK.md` — Web APIs for `navigator.mediaDevices.getUserMedia`.

### Client implementation (existing)
- `src/client/main.tsx` — App shell and `EventsScreen` wiring.
- `src/client/events-screen.tsx` — Events list and toolbar layout (integration point for collapsible media section).
- `src/client/styles.css` — Design tokens and error/empty patterns to match for new alerts.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`EventsScreen`** (`src/client/events-screen.tsx`): Add a collapsible media block above or below the existing toolbar/meta pattern; keep single-page Events flow.
- **`styles.css`**: Reuse `--color-destructive`, panel radii, and spacing tokens for new media UI and alerts.

### Established Patterns
- Errors: `role="alert"` with panel styling (`events-error`, `events-empty`).
- Buttons: `events-btn` class for toolbar actions.

### Integration Points
- New hooks/modules under `src/client/` (e.g. `useMediaCapture` or similar) consumed by `EventsScreen` or `main.tsx`; **no orchestrator changes** required for Phase 5.

</code_context>

<specifics>
## Specific Ideas

- User selected **collapsible** media UI (not always-visible block or toolbar row).
- User selected **full** running-state visibility: **mic level meter** + **small camera preview** + independent device toggles.

</specifics>

<deferred>
## Deferred Ideas

- **POST /events** from media signals, throttling, `event_type` naming — **Phase 6** per roadmap.
- **E2E confirmation that media rows appear in Events list** — **Phase 7**.

### Reviewed Todos (not folded)
_None._

</deferred>

---

*Phase: 05-local-media-capture*
*Context gathered: 2026-04-15*
