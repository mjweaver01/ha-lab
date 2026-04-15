# Stack Research

**Domain:** Browser media capture → HTTP orchestrator (Bun lab)
**Researched:** 2026-04-15
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-------------------|
| Web APIs (`navigator.mediaDevices.getUserMedia`) | Living standard | Mic/camera capture in the React client | Secure context (localhost/https), one permission model across macOS Chrome/Safari/Firefox for lab |
| Web Audio API (`AudioContext`, `AnalyserNode`) | Living standard | RMS / frequency energy for thresholds | No native addons; works with existing Bun + React stack |
| Canvas 2D or `ImageData` | Living standard | Optional video frame sampling / diff stubs | Matches “learning prototype” scope without WebCodecs complexity |
| `fetch` to orchestrator | Built-in | POST `PostEventBody` | Already used by simulated node pattern |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|-----------|-------------|
| *(none required initially)* | — | — | Prefer standards-first; add a small util only if scheduling/throttle code gets noisy |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Browser DevTools | Permissions, media logging | Test deny/allow flows |
| `bun run client` + `bun run` server | Split origin | CORS already a lab concern; keep orchestrator URL configurable |

## Installation

No new package managers required for baseline capture + Web Audio. If later you add WASM vision helpers, pin versions explicitly.

## Integration with Existing Stack

- **Orchestrator:** Unchanged Bun `POST /events`; payload remains `PostEventBody` (`home_id`, `event_type`, optional `body`).
- **Client:** Extend React app only; avoid moving capture to Bun unless you explicitly need non-browser capture (out of scope for v1.1 default path).
