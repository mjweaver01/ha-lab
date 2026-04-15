# Codebase Structure

**Analysis Date:** 2026-04-15

## Directory Layout

```text
home-assist/
├── index.ts                 # Server process entrypoint
├── package.json             # Scripts and dependency manifest
├── bunfig.toml              # Bun static bundler env exposure
├── scripts/                 # Utility CLI flows (event simulation, seeding)
├── src/
│   ├── server.ts            # Bun HTTP server/router composition
│   ├── routes/              # HTTP route handlers
│   ├── db/                  # SQLite connection, migrations, DB helpers
│   ├── webhooks/            # Subscriber fan-out delivery logic
│   ├── types/               # Shared API contracts
│   └── client/              # Browser UI (React + TSX + client libs)
├── .planning/               # GSD planning artifacts and generated maps
└── .cursor/skills/          # Project workflow skills for agent automation
```

## Directory Purposes

**`src/routes/`:**
- Purpose: API endpoint behavior for event ingest/read and subscriber registration.
- Contains: Boundary parsing/validation and DB transaction orchestration.
- Key files: `src/routes/events.ts`, `src/routes/subscribers.ts`

**`src/db/`:**
- Purpose: Schema lifecycle + DB connectivity + minimal helper writes.
- Contains: Migration runner, SQL migration files, DB open/config helpers, seed helpers.
- Key files: `src/db/database.ts`, `src/db/migrate.ts`, `src/db/migrations/001_initial.sql`, `src/db/migrations/002_events_subscribers.sql`, `src/db/homes.ts`

**`src/webhooks/`:**
- Purpose: Asynchronous downstream callback fan-out with delivery auditing.
- Contains: Delivery implementation and targeted tests.
- Key files: `src/webhooks/fan-out.ts`, `src/webhooks/fan-out.test.ts`

**`src/client/`:**
- Purpose: React events UI plus media capture/settings experience.
- Contains: TSX screens/components, hooks, API client, client-only domain libs, styles, HTML mount shell.
- Key files: `src/client/main.tsx`, `src/client/events-screen.tsx`, `src/client/media-capture-section.tsx`, `src/client/media-settings-page.tsx`, `src/client/hooks/use-media-capture.ts`, `src/client/api/events-client.ts`

**`src/types/`:**
- Purpose: Shared request contract types reused across server and client.
- Contains: API payload shape declarations.
- Key files: `src/types/events-api.ts`

**`scripts/`:**
- Purpose: Dev and demo workflows that exercise the running orchestrator.
- Contains: Simulated producer and seed scripts.
- Key files: `scripts/simulated-node.ts`, `scripts/seed-lab.ts`

## Key File Locations

**Entry Points:**
- `index.ts`: Primary server bootstrap for normal app runtime.
- `src/client/index.html`: Browser document entry that loads `src/client/main.tsx`.
- `src/db/migrate.ts`: Migration CLI entrypoint via `import.meta.main`.
- `scripts/simulated-node.ts`: CLI producer for posting sample events.

**Configuration:**
- `package.json`: Runtime/test/client scripts (`dev`, `client`, `migrate`, `simulate`).
- `tsconfig.json`: Strict TS + bundler module resolution + TS extension imports.
- `bunfig.toml`: Exposes `PUBLIC_*` vars to the Bun HTML bundle.

**Core Logic:**
- `src/server.ts`: Request routing and CORS handling.
- `src/routes/events.ts`: Event ingestion/listing lifecycle.
- `src/webhooks/fan-out.ts`: Subscriber delivery write-audit loop.
- `src/client/hooks/use-media-capture.ts`: Browser media stream + event emit orchestration.
- `src/client/lib/media-signals.ts`: Throttled classifier-to-event bridge.

**Testing:**
- `src/orchestrator.integration.test.ts`: End-to-end orchestrator behavior.
- `src/db/migrate.test.ts`: Migration and DB integrity tests.
- `src/webhooks/fan-out.test.ts`: Delivery behavior and DB audit tests.
- `src/client/**/*.test.ts*`: UI hook/component/lib tests colocated with implementation.

## Naming Conventions

**Files:**
- Use kebab-case for modules (`media-settings-page.tsx`, `use-events-poll.ts`).
- Keep test files colocated with source and suffix `.test.ts` or `.test.tsx`.
- Use explicit `.ts`/`.tsx` extensions in imports across all source files.

**Directories:**
- Organize by technical boundary first (`routes`, `db`, `webhooks`, `client`, `types`).
- Inside client, split by role: `api/`, `hooks/`, `lib/`, plus top-level page/component files.

## Where to Add New Code

**New API Endpoint:**
- Route implementation: `src/routes/`
- Server route wiring: `src/server.ts`
- Shared contracts: `src/types/`
- Endpoint tests: `src/orchestrator.integration.test.ts` or a colocated `src/routes/*.test.ts`

**New Database-backed Capability:**
- Schema changes: new SQL file in `src/db/migrations/` (next numeric prefix).
- DB access helpers: `src/db/`
- Route/service usage: `src/routes/` or `src/webhooks/` depending on caller.

**New Client Feature:**
- Screen/component shell: `src/client/`
- Side-effect logic: `src/client/hooks/`
- Reusable pure logic: `src/client/lib/`
- HTTP calls: `src/client/api/`
- Tests: colocated `*.test.ts` / `*.test.tsx` beside changed module.

**New Utility/Simulation Flow:**
- CLI script: `scripts/`
- Keep API payload compatibility by reusing types from `src/types/events-api.ts` when possible.

## Special Directories

**`.planning/`:**
- Purpose: Project planning state, phase artifacts, and generated codebase maps.
- Generated: Yes (workflow-managed documents are generated and updated repeatedly).
- Committed: Yes.

**`.cursor/skills/`:**
- Purpose: Local command/automation skills used by GSD workflows.
- Generated: No (maintained skill definitions and instructions).
- Committed: Yes.

**`data/` (runtime output path):**
- Purpose: Default location for SQLite file (`data/home-assist.sqlite`) resolved by `src/db/database.ts`.
- Generated: Yes (created at runtime or during migration).
- Committed: No (runtime artifact directory).

---

*Structure analysis: 2026-04-15*
