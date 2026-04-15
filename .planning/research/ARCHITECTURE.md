# Architecture Research

**Researched:** 2026-04-15

## Integration with Existing Architecture

```
[Browser: React client]
   getUserMedia → MediaStream
        ↓
   Audio: AnalyserNode (loop via requestAnimationFrame or short interval)
   Video: optional canvas draw + sample / lightweight diff stub
        ↓
   Throttle → fetch(POST /events) → [Bun orchestrator] → SQLite + fan-out
        ↓
   GET /events poll → Events UI (existing)
```

## New vs Modified

| Area | Change |
|------|--------|
| Client | New module(s): media hook, optional debug panel, POST helper reusing orchestrator base URL |
| Orchestrator | Likely **no schema change** if `event_type` + `body` carry media metadata |
| Simulator | Unchanged |

## Suggested Build Order

1. **Capture + permission UX** — Streams open; user can start/stop; errors surfaced.
2. **Audio → events** — Single threshold path end-to-end (fastest proof).
3. **Video → events** — Secondary signal (periodic or diff stub) to avoid scope creep.

## Data Flow Notes

- User gesture may be required to call `getUserMedia` — tie “Start monitoring” to a button click.
- HTTPS or `localhost` for `getUserMedia` — document for lab.
