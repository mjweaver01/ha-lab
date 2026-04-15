# Requirements: Home Assist Lab

**Defined:** 2026-04-15  
**Milestone:** v1.1 Local media events  
**Core value:** End-to-end trace one event from node → orchestrator → subscribed user alert.

## v1.1 Requirements

Requirements for this milestone. Each maps to roadmap phases (starting at phase **5**).

### Media capture

- [ ] **MEDIA-01**: User can start and stop **microphone** capture from the client, with clear handling when permission is denied, dismissed, or revoked.
- [ ] **MEDIA-02**: User can start and stop **camera** capture from the client, with the same permission behavior as mic (clear errors, no silent failure).

### Media → orchestrator events

- [ ] **MEDIA-03**: **Audio-derived** activity produces `POST /events` requests using the locked **`PostEventBody`** shape (`home_id`, `event_type`, optional `body`), with **throttling** so the orchestrator is not flooded.
- [ ] **MEDIA-04**: **Video-derived** activity produces `POST /events` with the same contract (acceptable: periodic sample, lightweight frame diff stub, or explicit “video activity” pattern documented in code).

### End-to-end trace

- [ ] **MEDIA-05**: Media-originated events are **listed** in the React Events view with the same visibility rules as other events (user can confirm a real mic/camera-driven event end-to-end).

## Future requirements (deferred)

Not in v1.1 roadmap; tracked for later versions.

### Possible later

- Native / non-browser capture on macOS (FFmpeg, ScreenCaptureKit) for headless or CLI-driven events.
- Rich video analytics (on-device ML, object labels).
- WebRTC or streaming to subscribers (beyond discrete webhook events).

## Out of scope

| Feature | Reason |
|---------|--------|
| Full RTSP / NVR / continuous streaming | Lab uses discrete events; keep orchestrator simple |
| HomeKit / Matter / Home Assistant integration | Explicitly out of lab (see PROJECT.md) |
| Multi-tenant production auth | Deferred optional hardening |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MEDIA-01 | Phase 5 | Pending |
| MEDIA-02 | Phase 5 | Pending |
| MEDIA-03 | Phase 6 | Pending |
| MEDIA-04 | Phase 6 | Pending |
| MEDIA-05 | Phase 7 | Pending |

**Coverage:**

- v1.1 requirements: **5** total  
- Mapped to phases: **5** / 5  
- Unmapped: **0**  

---

*v1.0 requirements snapshot:* [`milestones/v1.0-REQUIREMENTS.md`](milestones/v1.0-REQUIREMENTS.md)

---
*Requirements defined: 2026-04-15 (milestone v1.1)*
