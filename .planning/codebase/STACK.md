# Technology Stack

**Analysis Date:** 2026-04-15

## Languages

**Primary:**
- TypeScript (TS 5 peer range) - application/runtime code in `index.ts`, `src/server.ts`, `src/routes/events.ts`, `src/client/main.tsx`, and scripts under `scripts/*.ts`.

**Secondary:**
- SQL (SQLite dialect) - schema and migration logic in `src/db/migrations/001_initial.sql` and `src/db/migrations/002_events_subscribers.sql`.
- HTML/CSS - Bun-served client shell in `src/client/index.html` and styling in `src/client/styles.css`.

## Runtime

**Environment:**
- Bun runtime (project notes pin Bun v1.3.8) used for server, client bundling, scripts, and tests via commands in `package.json` and runtime APIs in `src/server.ts`.
- Node-compatible standard modules (`node:fs`, `node:path`, `node:url`, `node:util`) used inside Bun, e.g. `src/db/migrate.ts` and `scripts/simulated-node.ts`.

**Package Manager:**
- Bun (`bun install`, `bun run ...`) defined by scripts in `package.json`.
- Lockfile: present (`bun.lock`).

## Frameworks

**Core:**
- Bun HTTP server (`Bun.serve`) - orchestrator API entrypoint in `src/server.ts`.
- React `19.2.5` + React DOM `19.2.5` - client rendering flow in `src/client/main.tsx`, `src/client/events-screen.tsx`, and `src/client/media-settings-page.tsx`.

**Testing:**
- Bun test runner (`bun:test`) - unit and integration suites across `src/**/*.test.ts` and `src/**/*.test.tsx`.
- `@testing-library/react` `16.3.2` + `happy-dom` `20.9.0` - UI and hook tests in `src/client/media-capture-section.test.tsx` and `src/client/hooks/use-media-capture.test.ts`.

**Build/Dev:**
- Bun HTML bundler (`bun ./src/client/index.html`) for frontend development from `package.json` script `client`.
- TypeScript compiler config in `tsconfig.json` (`strict`, `moduleResolution: bundler`, `jsx: react-jsx`) with `noEmit` mode.
- Bun static env inlining config in `bunfig.toml` (`PUBLIC_*` exposure for client bundle).

## Key Dependencies

**Critical:**
- `react` `19.2.5` - component/runtime base for all UI modules in `src/client/`.
- `react-dom` `19.2.5` - DOM mounting in `src/client/main.tsx`.
- Built-in `bun:sqlite` - persistence layer used by `src/db/database.ts`, `src/routes/events.ts`, and `src/webhooks/fan-out.ts`.

**Infrastructure:**
- `@mediapipe/tasks-audio` `^0.10.34` - declared for browser audio signal pipeline capabilities, referenced in stack decisions from `package.json` and planning artifacts in `.planning/phases/06-media-signals-events/`.
- `@mediapipe/tasks-vision` `^0.10.34` - declared for browser vision signal pipeline capabilities, tracked in `package.json`.
- `@types/bun` `latest` and React type packages - TypeScript support for Bun/React APIs used across `src/` and `scripts/`.

## Configuration

**Environment:**
- Server port: `PORT` (fallback `3000`) in `src/server.ts`.
- SQLite file path: `SQLITE_PATH` (fallback `data/home-assist.sqlite`) in `src/db/database.ts`.
- Simulator target URL: `ORCHESTRATOR_URL` in `scripts/simulated-node.ts`.
- Browser/public client config: `PUBLIC_ORCHESTRATOR_URL`, `PUBLIC_HOME_ID`, `PUBLIC_POLL_MS` read in `src/client/lib/public-env.ts` and exposed through `bunfig.toml`.

**Build:**
- `package.json` scripts define canonical workflows (`dev`, `start`, `client`, `migrate`, `seed`, `simulate`, `test`).
- `tsconfig.json` controls compile-time strictness and module behavior.
- `bunfig.toml` controls static env injection for browser bundles.

## Platform Requirements

**Development:**
- Bun installed locally (setup/run steps in `README.md`).
- Writable local filesystem for SQLite DB and migrations under `data/` via `src/db/database.ts` and `src/db/migrate.ts`.
- Browser with Media APIs (`navigator.mediaDevices`, `AudioContext`) for full client feature set in `src/client/hooks/use-media-capture.ts`.

**Production:**
- Deployment target is a Bun process hosting orchestrator HTTP routes from `index.ts` and `src/server.ts`.
- Persistent local or mounted storage for SQLite DB file configured by `SQLITE_PATH`.
- Reachable network path to subscriber callback endpoints used by outbound fan-out in `src/webhooks/fan-out.ts`.

---

*Stack analysis: 2026-04-15*
