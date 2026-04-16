# Home Assist

Home Assist is a local-first prototype for tracing events from a simulated edge node, through a Bun-based orchestrator, to subscribed users and a React client.

The system combines:

- A webhook orchestrator built with `Bun.serve`
- SQLite persistence for homes, users, and events
- A simulated node event producer
- A React events interface with live media signal support

## Current Product Status

As of 2026-04-15:

- `v1.0` shipped as the baseline learning prototype (tag: `v1.0`)
- Milestone `v1.1` (Local media events) is complete
- Milestone `v1.1` delivered:
  - Local media capture UX (Phase 5)
  - Media signal to event pipeline with runtime verification (Phase 6)
  - End-to-end media trace validation (Phase 7)
- Next planned work is milestone `v1.2` scoping and planning

Authoritative planning, requirements, and milestone notes are maintained in `.planning/PROJECT.md`.

## Key Capabilities

- Media settings and capture flows in the client
- Live audio/video detection overlays
- Snapshot-based custom label learning in browser storage
- Events list with live tail or timeframe filtering
- Virtualized rendering and pagination for larger event histories

## Technology Stack

- Bun
- TypeScript
- `bun:sqlite`
- React (Bun HTML bundler, no Vite)

## Getting Started

Install dependencies and initialize local data:

```bash
bun install
bun run migrate
bun run seed
```

`bun run seed` creates the default `Lab` home and user (`home_id=1`). Without seed data, `POST /events` for `home_id=1` returns `404 home not found`.

## Running the Application

Start services in separate terminals.

1. Orchestrator (default port `3000`)

```bash
bun run dev
```

2. Simulated node (optional)

```bash
ORCHESTRATOR_URL=http://127.0.0.1:3000 bun run simulate -- --home 1
```

3. React client (optional)

```bash
PUBLIC_ORCHESTRATOR_URL=http://127.0.0.1:3000 PUBLIC_HOME_ID=1 bun run client
```

When testing media features, allow browser microphone and camera permissions.

## Testing

```bash
bun test
```

Current test coverage includes database behavior, orchestrator integration, event fan-out, simulated node flows, and client utility logic.
