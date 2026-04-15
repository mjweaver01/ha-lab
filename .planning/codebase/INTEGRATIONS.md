# External Integrations

**Analysis Date:** 2026-04-15

## APIs & External Services

**Orchestrator HTTP API (internal service boundary):**
- `GET /events?home_id=...`, `POST /events`, and `POST /subscribers` exposed by `src/server.ts` with handlers in `src/routes/events.ts` and `src/routes/subscribers.ts`.
  - SDK/Client: custom fetch client in `src/client/api/events-client.ts` and simulator client in `scripts/simulated-node.ts`.
  - Auth: Not implemented (`src/server.ts` has no auth middleware or token checks).

**Subscriber callback endpoints (external consumer services):**
- User-provided subscriber URLs are registered through `POST /subscribers` in `src/routes/subscribers.ts`.
  - SDK/Client: outbound webhook delivery via platform `fetch` in `src/webhooks/fan-out.ts`.
  - Auth: none (no signature, token, mTLS, or HMAC headers set in `src/webhooks/fan-out.ts`).

**Browser platform APIs (client-side integrations):**
- Device/media APIs: microphone and camera capture through `navigator.mediaDevices.getUserMedia` in `src/client/hooks/use-media-capture.ts`.
  - SDK/Client: Web Media APIs + `AudioContext` analyzer in `src/client/hooks/use-media-capture.ts`.
  - Auth: browser permission prompts only (no app-level identity system).

## Data Storage

**Databases:**
- SQLite (embedded/local), accessed through Bun's `bun:sqlite` driver in `src/db/database.ts`.
  - Connection: `SQLITE_PATH` env var (fallback `data/home-assist.sqlite`) from `src/db/database.ts`.
  - Client: direct SQL via `Database` in `src/db/*`, `src/routes/*`, and `src/webhooks/fan-out.ts`.

**File Storage:**
- Local filesystem only (`data/home-assist.sqlite` and migration SQL under `src/db/migrations/`).

**Caching:**
- None detected (no Redis/memcache layer; request data is fetched directly each poll in `src/client/hooks/use-events-poll.ts`).

## Authentication & Identity

**Auth Provider:**
- Custom/none - no identity provider configured.
  - Implementation: no authentication or authorization checks in `src/server.ts`, `src/routes/events.ts`, or `src/routes/subscribers.ts`.

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/Datadog/New Relic SDK imports in `src/`).

**Logs:**
- Console logging from server request lifecycle in `src/server.ts`.
- Delivery outcomes persisted in DB table `event_deliveries` by `src/webhooks/fan-out.ts` and schema in `src/db/migrations/002_events_subscribers.sql`.

## CI/CD & Deployment

**Hosting:**
- Bun-hosted application process initiated from `index.ts` and `package.json` scripts.

**CI Pipeline:**
- None detected (no workflow files under `.github/workflows/`).

## Environment Configuration

**Required env vars:**
- `PORT` - orchestrator listen port (`src/server.ts`).
- `SQLITE_PATH` - SQLite DB location (`src/db/database.ts`).
- `ORCHESTRATOR_URL` - simulator destination (`scripts/simulated-node.ts`).
- `PUBLIC_ORCHESTRATOR_URL` - browser API base URL (`src/client/lib/public-env.ts`).
- `PUBLIC_HOME_ID` - browser home context (`src/client/lib/public-env.ts`).
- `PUBLIC_POLL_MS` - browser polling interval (`src/client/lib/public-env.ts`).

**Secrets location:**
- Not detected; repo uses non-secret runtime config env vars and local defaults only.

## Webhooks & Callbacks

**Incoming:**
- `POST /events` ingests node/media events (`src/routes/events.ts`).
- `POST /subscribers` registers callback destinations (`src/routes/subscribers.ts`).

**Outgoing:**
- Fan-out `POST` requests to each stored `subscribers.callback_url` from `src/webhooks/fan-out.ts`.
- Payload schema includes `event_id`, `home_id`, `event_type`, and `body`, assembled in `src/webhooks/fan-out.ts`.

---

*Integration audit: 2026-04-15*
