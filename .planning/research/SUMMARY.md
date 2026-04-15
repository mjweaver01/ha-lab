# Project Research Summary

**Project:** Home Assist Lab  
**Domain:** Browser local media → webhook orchestrator events  
**Researched:** 2026-04-15  
**Confidence:** HIGH

## Executive Summary

For v1.1, the lowest-friction path is **browser-first**: use **`getUserMedia`** in the existing React client, analyze audio with the **Web Audio API**, and optionally sample video frames via **Canvas** for coarse “something changed” style events. POST payloads should stay within the existing **`PostEventBody`** contract by encoding media specifics in `event_type` and structured `body`. The main risks are **permission UX**, **request rate** to the orchestrator, and **cross-browser differences**; all are manageable in a lab with explicit start/stop controls and throttling.

## Key Findings

### Recommended Stack

- **Standards only** for the first slice: `getUserMedia`, `AudioContext` + `AnalyserNode`, `fetch` to the Bun orchestrator.
- **No new server-side media stack** unless you later choose headless capture (out of default scope).

### Expected Features

**Must have (table stakes):**

- Permission-aware capture start/stop for mic and camera  
- At least one **audio-derived** orchestrator event users can see in the Events list  
- At least one **video-derived** or video-channel event (can be a deliberate “stub” pattern, consistent with v1.0 `camera.stub` spirit)  

**Should have:**

- Throttling/debounce and clear `event_type` naming  
- Optional debug readout for tuning audio thresholds  

**Defer:**

- Real surveillance pipelines, native macOS capture agents, ML classification  

### Architecture Approach

Add a **client-side pipeline** from `MediaStream` to `POST /events`, leaving the orchestrator and SQLite path unchanged. Build **audio first**, then **video**, to shorten time-to-first-real-event.

### Critical Pitfalls

1. Flooding `/events` — mitigate with minimum POST interval.  
2. Silent permission failures — show errors in UI.  
3. Constraint / browser quirks — test Chrome and Safari on macOS.

## Roadmap Implications

- Phase **5+** should separate **capture shell** from **signal→event** work so permissions can be validated before tuning thresholds.
