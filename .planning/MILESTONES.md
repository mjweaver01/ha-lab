# Milestones

## v1.0 learning prototype (Shipped: 2026-04-15)

**Phases completed:** 4 phases, 7 plans, 18 tasks

**Key accomplishments:**

- Initial SQLite schema and migration runner are in place so homes and membership can be stored with FK enforcement.
- Parameterized home/user/membership helpers and integration tests prove HOME-01, HOME-02, and D-11 (persistence across reopen).
- SQLite DDL for events, subscribers, and delivery audit plus locked `PostEventBody` / `PostSubscriberBody` types so Wave 2 HTTP work compiles against a stable contract.
- Bun HTTP service with locked `PostEventBody`, persisted subscribers, GET listing by `home_id`, and parallel fan-out with recorded deliveries — verified with mocked `fetch` for two subscribers.
- Bun CLI + tests that POST Phase 2 `PostEventBody` JSON to `ORCHESTRATOR_URL/events` with motion, door, and camera.stub in one run, plus `bun run simulate`.
- Typed GET /events client and pure poll-diff helpers with bun:test — foundation for the Events UI without shipping browser entry yet.
- React Events UI with 4s polling, accent rows for new ids, and orchestrator dev CORS — satisfies UI-01/UI-02 in the browser.

**Known deferred at close:** 1 — multi-phase manual UAT (`.planning/milestone-v1-UAT.md`) still `testing`; see STATE.md Deferred Items.

---
