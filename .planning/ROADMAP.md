# Roadmap: Home Assist Lab

**Current milestone:** v1.1 Local media events  
**Created:** 2026-04-15

## Milestones

- ✅ **[v1.0 learning prototype](milestones/v1.0-ROADMAP.md)** — Phases 1–4 (SQLite → orchestrator → simulator → React client). Shipped **2026-04-15**.
- ✅ **v1.1 Local media events** — Phases 5–7 (browser capture → signal → events → E2E in UI). *Complete.*

## Overview

v1.1 adds a **browser-first** path from this Mac’s **microphone and camera** to the existing orchestrator: `getUserMedia` and clear permission UX first, then **Web Audio** (and optional **canvas** video sampling) driving **throttled** `POST /events` with the locked **`PostEventBody`** shape, and finally confirmation that **media-originated rows** show up in the React Events list like any other event.

## Phases

**Phase numbering:** Integers 5–7 continue after v1.0 (1–4). Decimal phases (e.g. 5.1) are reserved for urgent insertions via `/gsd-insert-phase`.

- [x] **Phase 5: Local media capture** — Mic and camera start/stop with explicit permission and error handling. (completed 2026-04-15)
- [x] **Phase 6: Media signals → events** — Audio- and video-derived activity posts throttled `POST /events` (`PostEventBody`). *(Implementation + human verification complete.)*
- [x] **Phase 7: E2E media trace** — Media-driven events visible end-to-end in the React Events view. (completed 2026-04-15)

## Phase Details

### 🚧 v1.1 Local media events

**Milestone goal:** Real audio/video on the dev machine produce orchestrator events users can see in the same pipeline as v1.0 (no simulated node required for that path).

### Phase 5: Local media capture

**Goal**: Users can start and stop microphone and camera capture in the client with predictable behavior when permissions are denied, dismissed, or revoked.

**Depends on**: Phase 4 (v1.0 React client and orchestrator available)

**Requirements**: MEDIA-01, MEDIA-02

**Success Criteria** (what must be TRUE):

1. User can start and stop **microphone** capture from the client; running state is obvious (not ambiguous whether capture is active).
2. If mic permission is **denied**, **dismissed**, or **revoked**, the user sees a **clear message** (no silent failure).
3. User can start and stop **camera** capture from the client with the same clarity as mic.
4. Camera permission failures behave like mic: **clear errors**, no silent failure.

**Plans**: [`05-01-PLAN.md`](phases/05-local-media-capture/05-01-PLAN.md) (hook + errors + tests), [`05-02-PLAN.md`](phases/05-local-media-capture/05-02-PLAN.md) (Media capture UI + EventsScreen)

**UI hint**: yes

### Phase 6: Media signals → events

**Goal**: Audio- and video-derived activity results in orchestrator events using the existing HTTP contract without flooding the server.

**Depends on**: Phase 5

**Requirements**: MEDIA-03, MEDIA-04

**Success Criteria** (what must be TRUE):

1. **Audio-derived** activity triggers `POST /events` with valid **`PostEventBody`** (`home_id`, `event_type`, optional `body`) matching `src/types/events-api.ts`.
2. POSTs are **throttled** (minimum interval or equivalent) so sustained activity does not overwhelm `/events` (verifiable via behavior or documented limits).
3. **Video-derived** activity triggers `POST /events` with the same contract (e.g. periodic canvas sample, lightweight diff, or documented “video activity” pattern in code comments).
4. Naming for `event_type` / `body` for audio vs video paths is **documented in code** so the pipeline stays inspectable.

Plans:
- [x] `06-01-PLAN.md` — Add shared media event contract constants/body helpers and typed client `postEvent` transport.
- [x] `06-02-PLAN.md` — Build classifier-driven media signal pipeline with independent audio/video throttles and tests.
- [x] `06-03-PLAN.md` — Wire signal pipeline into capture hook and enable verified `/events` CORS POST/preflight behavior.

**Execution note (2026-04-15):**
- Media settings page, live detection overlays, and snapshot-based custom label learning are implemented.
- Events UI now supports live tail/timeframe filtering with virtualized pagination.
- Remaining gate for full phase close is human runtime verification (`06-HUMAN-UAT.md`).

### Phase 7: E2E media trace

**Goal**: Users can confirm media-originated events through the same fan-out and Events UI path as scripted v1.0 events.

**Depends on**: Phase 6

**Requirements**: MEDIA-05

**Success Criteria** (what must be TRUE):

1. Events produced from **audio** activity appear in the **React Events** list with the same visibility and listing rules as events from other sources (e.g. polling / new-row behavior unchanged in intent).
2. Events produced from **video** activity appear in the same Events list **consistently**.
3. User can perform an **end-to-end check** without the simulated node: enable capture → produce activity → see a new row attributable to the media pipeline.

**Plans**:
- [x] `07-01-PLAN.md` — Add explicit Events UI test evidence for media event row visibility and new-row behavior parity.

**UI hint**: yes

---

## Shipped: v1.0 (reference)

Full phase goals and history: [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md).

## Progress

**Execution order:** 5 → 6 → 7 (decimal insertions e.g. 5.1 run between 5 and 6 when used).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–4 | v1.0 | 7/7 | Complete | 2026-04-15 |
| 5. Local media capture | v1.1 | 2/2 | Complete    | 2026-04-15 |
| 6. Media signals → events | v1.1 | 3/3 | Complete | 2026-04-15 |
| 7. E2E media trace | v1.1 | 1/1 | Complete | 2026-04-15 |
