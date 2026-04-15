---
status: passed
phase: 03-simulated-node
verified: 2026-04-15
---

# Phase 3 — Goal verification

**Goal (ROADMAP):** No hardware—script sends realistic sample payloads.

## Must-haves (from plans)

| Criterion | Evidence |
|-----------|----------|
| Documented `bun run` command POSTs JSON to `{ORCHESTRATOR_URL}/events` | `package.json` → `simulate`; `scripts/simulated-node.ts` → `postEvent`, `eventsPostUrl` |
| POST body uses `home_id`, `event_type`, optional `body` (`PostEventBody`) | `scripts/simulated-node.ts` interface + factories |
| Default run emits **motion**, **door**, and **camera.stub** (`allSampleEvents`) | `scripts/simulated-node.ts`, `scripts/simulated-node.test.ts` |
| `fetch` POST with `Content-Type: application/json`; exit non-zero when `!response.ok` | `postEvent`, `main` loop |
| URL scheme limited to `http`/`https`; base from `ORCHESTRATOR_URL` or `--url` | `normalizeOrchestratorBaseUrl`, CLI |

## Automated checks

- `bun test` (repo root) — **pass** (14 tests including `scripts/simulated-node.test.ts`).

## Requirement traceability

| ID | Result |
|----|--------|
| NODE-01 | Satisfied — simulated node CLI + tests; `requirements mark-complete` applied |

## Roadmap success criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Documented command sends ≥ two event types | **Satisfied** — `bun run simulate` sends three types (motion, door, camera.stub) |
| 2 | Events visible in Phase 2 storage/logs | **Satisfied when orchestrator runs** — same payload shape as Phase 2 integration tests; manual smoke: start orchestrator + `ORCHESTRATOR_URL=... bun run simulate` |

## Human verification

None required (no UI hint in ROADMAP).

## Gaps

None.
