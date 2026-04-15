# Architecture

**Analysis Date:** 2026-04-15

## Pattern Overview

**Overall:** Layered monolith (Bun HTTP + SQLite) with a colocated React client and shared TypeScript contracts.

**Key Characteristics:**
- Single runtime process handles HTTP orchestration and DB access in `index.ts` and `src/server.ts`.
- Route handlers own request validation and response shaping in `src/routes/events.ts` and `src/routes/subscribers.ts`.
- Domain-specific client behavior is split into hooks and pure helper modules under `src/client/hooks/` and `src/client/lib/`.

## Layers

**Runtime + Composition Layer:**
- Purpose: Bootstrap process-level dependencies and expose executable entry points.
- Location: `index.ts`, `src/server.ts`, `scripts/simulated-node.ts`, `src/db/migrate.ts`
- Contains: Bun server startup, CLI argument parsing, migration invocation.
- Depends on: DB access layer and route modules.
- Used by: Local dev (`bun run dev`), tests, and maintenance scripts.

**HTTP API Layer:**
- Purpose: Translate HTTP requests into validated command/query operations.
- Location: `src/routes/events.ts`, `src/routes/subscribers.ts`
- Contains: JSON parsing, input guards, status code mapping, orchestration to downstream delivery.
- Depends on: `bun:sqlite` database handle and webhook fan-out module.
- Used by: Simulated node (`scripts/simulated-node.ts`) and browser client (`src/client/api/events-client.ts`).

**Persistence Layer:**
- Purpose: Centralize SQLite connection behavior, schema evolution, and low-level data writes/reads.
- Location: `src/db/database.ts`, `src/db/migrate.ts`, `src/db/migrations/001_initial.sql`, `src/db/migrations/002_events_subscribers.sql`, `src/db/homes.ts`
- Contains: DB file resolution, `PRAGMA foreign_keys`, migration execution, seed-style helpers.
- Depends on: `bun:sqlite` and filesystem APIs.
- Used by: `src/server.ts`, route handlers, tests, and migration CLI.

**Webhook Delivery Layer:**
- Purpose: Fan-out event payloads to subscribers and persist delivery audit results.
- Location: `src/webhooks/fan-out.ts`
- Contains: Subscriber lookup, `fetch` delivery loop, `Promise.allSettled` isolation, delivery status persistence.
- Depends on: Events/subscribers schema and runtime `fetch`.
- Used by: `src/routes/events.ts` after successful event insert.

**Client App Layer:**
- Purpose: Render events UI, capture media activity, and call orchestrator APIs.
- Location: `src/client/main.tsx`, `src/client/events-screen.tsx`, `src/client/media-capture-section.tsx`, `src/client/media-settings-page.tsx`
- Contains: Page switching, polling UI, virtualization/pagination controls, media-capture controls.
- Depends on: Hook layer and API client.
- Used by: Browser entry document `src/client/index.html`.

**Client Domain/Hook Layer:**
- Purpose: Hold reusable client-side business logic and side-effect orchestration.
- Location: `src/client/hooks/use-events-poll.ts`, `src/client/hooks/use-media-capture.ts`, `src/client/lib/media-signals.ts`, `src/client/lib/events-view.ts`, `src/client/lib/media-learning.ts`
- Contains: Polling lifecycle, media stream handling, classifier throttling, timeframe filtering, local learning sample storage.
- Depends on: Browser APIs, shared event types, API client.
- Used by: React screen/page components.

**Shared Contract Layer:**
- Purpose: Keep request payload contracts consistent between server and client.
- Location: `src/types/events-api.ts`, consumed by `src/routes/events.ts` and `src/client/api/events-client.ts`
- Contains: `PostEventBody` and `PostSubscriberBody` contract types.
- Depends on: TypeScript type system only.
- Used by: API boundary code on both sides.

## Data Flow

**Event Ingestion + Fan-out Flow:**

1. Producer sends `POST /events` from `scripts/simulated-node.ts` or `src/client/hooks/use-media-capture.ts` via `src/client/api/events-client.ts`.
2. `src/server.ts` routes to `handlePostEvent()` in `src/routes/events.ts`.
3. Route validates payload, checks `homes` existence, inserts into `events`, then calls `deliverEventToSubscribers()` in `src/webhooks/fan-out.ts`.
4. Fan-out POSTs JSON to each subscriber URL and records status rows into `event_deliveries`.
5. Server returns `201` JSON to caller.

**Events Read + UI Rendering Flow:**

1. `src/client/hooks/use-events-poll.ts` reads public env config from `src/client/lib/public-env.ts`.
2. Hook calls `fetchEvents()` in `src/client/api/events-client.ts` on interval and manual refresh.
3. `GET /events` in `src/routes/events.ts` returns newest-first rows for `home_id`.
4. `src/client/events-screen.tsx` applies filter/pagination/virtual window from `src/client/lib/events-view.ts`.
5. UI marks new IDs using helpers in `src/client/lib/new-events.ts`.

**State Management:**
- Server state is DB-backed in SQLite tables (`events`, `subscribers`, `event_deliveries` in `src/db/migrations/002_events_subscribers.sql`).
- Client state is local React state/refs in `src/client/main.tsx`, `src/client/events-screen.tsx`, and `src/client/hooks/use-media-capture.ts`.
- User-tuned media settings and learned labels persist in browser localStorage via `src/client/lib/media-settings.ts` and `src/client/lib/media-learning.ts`.

## Key Abstractions

**Orchestrator Server Factory:**
- Purpose: Encapsulate Bun server creation and DB wiring.
- Examples: `src/server.ts`
- Pattern: Constructor-style `createServer()` returning `{ server, url, db }` for easy test lifecycle control.

**Route Handler Modules:**
- Purpose: Keep endpoint-specific logic independent from router switch.
- Examples: `src/routes/events.ts`, `src/routes/subscribers.ts`
- Pattern: `handleX(req, db): Promise<Response>` functions with explicit input validation and consistent JSON error bodies.

**Media Signal Pipeline:**
- Purpose: Normalize classifier outputs into throttled event emissions.
- Examples: `src/client/lib/media-signals.ts`, `src/client/lib/media-throttle.ts`, `src/client/lib/media-event-types.ts`
- Pattern: Small pure pipeline object with `handleAudioClassification`/`handleVideoClassification`.

**Environment Reader Boundary:**
- Purpose: Isolate environment defaulting/parsing from UI/business code.
- Examples: `src/client/lib/public-env.ts`, `src/db/database.ts`
- Pattern: Dedicated read functions with defaults and validation guards.

## Entry Points

**Server Entry Point:**
- Location: `index.ts`
- Triggers: `bun run dev` / `bun run start`
- Responsibilities: Invoke `createServer()` from `src/server.ts`.

**HTTP Runtime Entry Point:**
- Location: `src/server.ts`
- Triggers: Imported by `index.ts` and tests (`src/orchestrator.integration.test.ts`)
- Responsibilities: Open DB, run route dispatch, log request status, expose running URL.

**Client Entry Point:**
- Location: `src/client/index.html` + `src/client/main.tsx`
- Triggers: `bun run client`
- Responsibilities: Mount React app, switch between events screen and media settings page.

**Migration Entry Point:**
- Location: `src/db/migrate.ts`
- Triggers: `bun run migrate` and direct execution (`import.meta.main`)
- Responsibilities: Apply sorted SQL files and update `schema_migrations`.

**Simulation Entry Point:**
- Location: `scripts/simulated-node.ts`
- Triggers: `bun run simulate`
- Responsibilities: Generate sample payloads and post to orchestrator `/events`.

## Error Handling

**Strategy:** Fail fast at boundaries, return explicit HTTP error JSON, and isolate fan-out failures per subscriber.

**Patterns:**
- JSON/body validation with early `400`/`404` returns in `src/routes/events.ts` and `src/routes/subscribers.ts`.
- Delivery failures captured as persisted audit rows instead of hard-failing ingest in `src/webhooks/fan-out.ts`.
- Client hook surfaces user-readable errors through component state in `src/client/hooks/use-events-poll.ts` and `src/client/hooks/use-media-capture.ts`.

## Cross-Cutting Concerns

**Logging:** Request-level console logging in `src/server.ts` (`[orchestrator] METHOD path -> status ms`).
**Validation:** Manual runtime validation and normalization in route handlers and API client (`src/routes/events.ts`, `src/client/api/events-client.ts`).
**Authentication:** Not implemented for API endpoints; current behavior is open local-lab access.

---

*Architecture analysis: 2026-04-15*
