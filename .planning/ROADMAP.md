# Roadmap: Home Assist Lab

**Milestone:** v1 (learning prototype)
**Created:** 2026-04-15

## Overview

| # | Phase | Goal | Requirements | Success criteria (observable) |
|---|--------|------|--------------|----------------|
| 1 | **Data model & SQLite** | Homes and users in local DB | HOME-01, HOME-02 | 1–3 |
| 2 | **Webhook orchestrator** | Ingest, persist, fan-out | HOOK-01–HOOK-04 | 4–7 |
| 3 | **Simulated node** | Emit events into orchestrator | NODE-01 | 8 |
| 4 | **React client** | Events list + alerts | UI-01, UI-02 | 9–10 |

---

## Phase 1: Data model & SQLite

**Goal:** Persistent homes and membership so later phases have stable IDs.

**Requirements:** HOME-01, HOME-02

**UI hint:** no

**Success criteria:**
1. SQLite schema exists (migrations or bootstrap code) for homes and user–home membership.
2. A short script or API test can create a home and attach a user.
3. Data survives process restart.

---

## Phase 2: Webhook orchestrator

**Goal:** Single Bun HTTP service that accepts node events and notifies subscribers.

**Requirements:** HOOK-01, HOOK-02, HOOK-03, HOOK-04

**Plans:** 2 plans

Plans:
- [ ] 02-01-PLAN.md — Schema migration `002_events_subscribers.sql`, API types (`PostEventBody`), extend migrate runner; blocking `bun test`
- [ ] 02-02-PLAN.md — `Bun.serve` HTTP (`POST/GET /events`, `POST /subscribers`), fan-out + `event_deliveries`, integration tests (ephemeral port + mock `fetch`)

**UI hint:** no

**Success criteria:**
1. POST `/events` (or equivalent) accepts a payload and returns 201/200 with stored event id.
2. Events are listed via GET or logged for debugging.
3. Subscriber registration is persisted per home.
4. Fan-out: two registered subscribers both receive delivery attempts (or recorded deliveries) for the same event.

---

## Phase 3: Simulated node

**Goal:** No hardware—script sends realistic sample payloads.

**Requirements:** NODE-01

**UI hint:** no

**Success criteria:**
1. `bun run` (or documented command) sends at least two event types to the orchestrator.
2. Events are visible in Phase 2 storage/logs.

---

## Phase 4: React client

**Goal:** See the pipeline in the browser.

**Requirements:** UI-01, UI-02

**UI hint:** yes

**Success criteria:**
1. React app loads and lists recent events for a configured home.
2. New events appear without full page reload (polling, SSE, or WebSocket).

---

## Dependency graph

- Phase 2 depends on Phase 1 (home ids).
- Phase 3 depends on Phase 2 (orchestrator URL).
- Phase 4 depends on Phase 2 (read API) and optionally Phase 3 for live traffic.
