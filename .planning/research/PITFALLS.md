# Pitfalls Research

**Researched:** 2026-04-15

## Pitfalls When Adding Media → Events

| Pitfall | Why it happens | Prevention |
|---------|----------------|------------|
| Orchestrator flood | Tight loops posting every frame | Minimum interval between POSTs; max events/sec cap in client |
| Opaque failures | Permissions, wrong origin, no HTTPS | Surface `NotAllowedError`, name, and recovery steps in UI |
| Drift from `PostEventBody` | Ad-hoc JSON | Centralize builder; document `event_type` conventions |
| Safari vs Chrome quirks | Codec, autoplay, `getUserMedia` constraints | Test both; start with conservative constraints `{ audio: true, video: true }` |
| Background tab throttling | `requestAnimationFrame` slows | Use `setInterval` for audio analysis with documented cadence |

## Phase Placement

- **Capture phase** should include permission denial paths.
- **Audio events phase** should include throttle tests (unit or integration style).
