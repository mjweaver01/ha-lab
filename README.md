# home-assist

Lab prototype: **Bun** + **SQLite** webhook orchestrator, simulated node, and **React** Events UI — trace activity from a node through the orchestrator to subscribers and the browser.

Entry: `bun run dev` serves the orchestrator from `index.ts` (not a console-only stub).

## Current state (as of 2026-04-15)

- **Shipped:** **v1.0** learning prototype (git tag **`v1.0`**) — SQLite homes/users, `Bun.serve` webhook routes, simulated node, React Events list with polling.
- **In progress:** **v1.1** — **Phase 5** is complete: local **browser media capture** UX on the Events screen (microphone/camera via `getUserMedia`, permission prompts). **Phase 6** is next: map media signals to orchestrator events (`POST /events`); not started yet.
- **Canonical detail:** requirements, roadmap alignment, and milestone notes live in **`.planning/PROJECT.md`**.
- **Stack:** Bun, TypeScript, `bun:sqlite`, React via Bun’s HTML bundler (no Vite).

## Setup

```bash
bun install
bun run migrate
bun run seed
```

`seed` creates a default **Lab** home (and user) so `home_id=1` exists. Without it, `POST /events` returns **404 home not found** for `--home 1`.

## Run

**Terminal 1 — orchestrator** (default port `3000`):

```bash
bun run dev
```

**Terminal 2 — simulate node** (optional):

```bash
ORCHESTRATOR_URL=http://127.0.0.1:3000 bun run simulate -- --home 1
```

**Terminal 3 — React client** (optional):

```bash
PUBLIC_ORCHESTRATOR_URL=http://127.0.0.1:3000 PUBLIC_HOME_ID=1 bun run client
```

The Events UI includes a **Media capture** panel (microphone and camera). Grant permissions in the browser when prompted. Phase 6 will wire captured signals to orchestrator events; until then, capture is UI/permissions-focused, not full signal→`POST /events` yet.

## Tests

```bash
bun test
```

Covers DB, orchestrator integration, fan-out, simulated node, and client helpers.

---

This project was created with `bun init` (Bun v1.3.8). [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
