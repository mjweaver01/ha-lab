# Features Research

**Domain:** Local AV → home events (lab)
**Researched:** 2026-04-15

## Table Stakes (users expect)

- **Permission prompts** — Clear affordance to start capture; graceful handling when mic/camera denied or revoked.
- **Observable events** — Something user-visible in the Events list when audio/video crosses a defined threshold or timer.
- **Correlation** — `event_type` and `body` carry enough context to distinguish audio vs video vs simulation (e.g. `audio.level`, `video.frame_stub`).

## Differentiators (nice for this lab)

- **Live level indicator** (optional) — Debug UI for audio energy so thresholds are tunable without guessing.
- **Throttle / debounce** — Avoid flooding orchestrator on every animation frame; batch or minimum interval between POSTs.

## Anti-features (defer)

- Full RTSP / NVR streaming, on-device ML object detection, multi-room sync, background tab capture without user gesture (policy-heavy).

## Dependencies on Existing Product

- **HOME / `home_id`** — Reuse configured home from client like today.
- **Simulated node** — Remains for regression; media path is additive.
