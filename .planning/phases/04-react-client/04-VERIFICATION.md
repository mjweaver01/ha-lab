---
status: passed
phase: 04-react-client
verified: 2026-04-15
---

# Phase 4 — Goal verification

**Goal (ROADMAP):** See the pipeline in the browser.

## Must-haves (from plans)

| Criterion | Evidence |
|-----------|----------|
| GET `/events?home_id=` via URL + `searchParams` | `src/client/api/events-client.ts` |
| Typed event rows; body as JSON/text | `EventListItem`, `events-screen.tsx` |
| Pure new-event helpers for polling highlight | `src/client/lib/new-events.ts`, `use-events-poll.ts` |
| React app lists events; UI-SPEC copy and dark theme | `events-screen.tsx`, `styles.css` |
| Polling 3–5s without full page reload | `use-events-poll.ts` (`DEFAULT_POLL_MS` 4000), no `location.reload` |
| Refresh button triggers fetch | `EventsScreen` → `onRefresh` |
| New rows accent `#3d8bfd` | `.events-row--new` |

## Automated checks

- `bun test` (repo root) — **pass** (includes client API + unit tests).

## Requirement traceability

| ID | Result |
|----|--------|
| UI-01 | Satisfied — `fetchEvents` + Events list UI |
| UI-02 | Satisfied — polling + `markNewEventIds` + accent styling |

## Roadmap success criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | React app loads and lists recent events for a configured home | **Satisfied** — `useEventsPoll` + `EventsScreen` + `PUBLIC_*` env |
| 2 | New events appear without full page reload | **Satisfied** — interval + `fetchEvents` |

## Human verification

Recommended manual smoke (per `04-VALIDATION.md`): run orchestrator (`bun run dev`), `bun run client` with `PUBLIC_HOME_ID` matching a seeded home, then `bun run simulate` and confirm list + highlight.

## Gaps

None for automated verification.
