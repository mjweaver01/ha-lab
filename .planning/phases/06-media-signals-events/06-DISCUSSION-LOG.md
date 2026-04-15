# Phase 6: Media signals → events - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 6-Media signals → events
**Areas discussed:** Audio/video signal semantics, throttle policy, video pipeline shape, event naming

---

## Audio and video signal semantics (classification)

| Option | Description | Selected |
|--------|-------------|----------|
| Heuristic (RMS / motion) | Threshold-based audio level and simple frame diff | |
| **Google MediaPipe** | Classify audio and video using MediaPipe Tasks (user’s prior experience) | ✓ |

**User's choice:** Use **Google MediaPipe** for **both** audio and video classification.

**Notes:** Primary event-driving logic should be MediaPipe outputs, not raw volume-only heuristics.

---

## Throttle policy

| Option | Description | Selected |
|--------|-------------|----------|
| User-specified numbers | User picks exact intervals | |
| **Implementer defaults** | Independent per-modality minimums chosen for the lab | ✓ |

**User's choice:** "Whatever you think" — locked in CONTEXT as **3s** audio / **4s** video minimum between posts.

---

## Video-derived detection shape

| Option | Description | Selected |
|--------|-------------|----------|
| Canvas/sample only | No ML, periodic diff | |
| **MediaPipe + documented frame path** | Meet MEDIA-04 inspectable pattern; feed frames to MediaPipe | ✓ |

**User's choice:** Still meet the roadmap “periodic sample / documented pattern” requirement while using MediaPipe as requested.

---

## `event_type` and `body` conventions

| Option | Description | Selected |
|--------|-------------|----------|
| User-picked strings | User defines every name | |
| **Implementer defaults** | Stable `media.audio` / `media.video` + classifier-oriented `body` | ✓ |

**User's choice:** "Whatever you think is best" — see CONTEXT **D-05** / **D-06**.

---

## Claude's Discretion

- Specific MediaPipe task models, load strategy, score thresholds, and failure UX (see CONTEXT).

## Deferred Ideas

- E2E Events list visibility — **Phase 7**.
