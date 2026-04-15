# Home Assist Lab

## What This Is

A **personal learning prototype** of a simplified “central home + webhook + alerts” model: a **simulated** node on your Mac, a **Bun** webhook **orchestrator** (SQLite) that receives events and fans them out to subscribers, and a **React** web client to list events and highlight new arrivals. It is intentionally **not** HomeKit, native mobile, or production Buildroot—enough **Bun + TypeScript + SQLite + React** to trace **node → orchestrator → subscribers → UI**.

## Core Value

You can **end-to-end trace one event** from “something happened on the node” → “orchestrator received and routed it” → “a subscribed endpoint was notified” → “a browser user sees activity without a full reload.”

## Requirements

### Validated (v1.0 — 2026-04-15)

- ✓ **SQLite home model** — Migrations, `homes` / `users` / `home_members`, FK enforcement (`HOME-01`, `HOME-02`).
- ✓ **Webhook orchestrator** — `Bun.serve`: POST/GET `/events`, POST `/subscribers`, fan-out with delivery records (`HOOK-01`–`HOOK-04`).
- ✓ **Simulated node** — `bun run simulate` posts sample `PostEventBody` events (`NODE-01`).
- ✓ **React client** — `bun run client` Events screen, polling, new-row accent (`UI-01`, `UI-02`).

### Active (v1.1 — complete)

- [x] **Local media capture** — Access this Mac’s microphone and camera (browser-first) with clear permission UX. *(Validated in Phase 5: 2026-04-15.)*
- [x] **Media → events** — Audio/video signal pipeline posts throttled `media.audio` / `media.video` events through `POST /events`. *(Phase 6 implementation complete; manual runtime checks pending in `06-HUMAN-UAT.md`.)*
- [x] **End-to-end trace** — Media-originated events are visible in the React Events list with parity behavior and E2E validation evidence.
- [x] **Operator UX upgrades** — Events screen now supports live tail vs timeframe filters, virtualized pagination, and a dedicated Media settings page with snapshot-based label learning.
- [ ] **Optional hardening** — Production-oriented auth, CORS policy, deployment story (only if you move beyond lab).

### Out of Scope

- **Real Raspberry Pi / Buildroot images** — Use your dev machine as the “node” for simulation.
- **Home Assistant, HomeKit, Matter, native iOS/Android** — Not in v1 lab; web only.
- **Production Postgres** — `bun:sqlite` for the lab; Postgres remains an optional later swap.
- **Multi-tenant SaaS hardening** — Auth can be minimal; no enterprise compliance story in the lab.

## Current Milestone: v1.1 Local media events

**Goal:** Use this computer’s real **audio** and **video** as inputs so orchestrator events reflect actual media activity, not only scripted simulation.

**Target features:**
- **Capture** — Mic and camera on the dev machine (browser `getUserMedia` as the default path; extend only if needed).
- **Signal → events** — Meaningful mapping (e.g. audio level / activity, optional video or motion-style cues) into `PostEventBody` or a small documented extension.
- **Same pipeline** — POST to orchestrator → subscribers → Events UI, preserving the core “trace one event” learning loop.

## Current state (after v1.0)

- **Shipped:** v1.0 **learning prototype** (tag **`v1.0`**). See `.planning/MILESTONES.md` and `.planning/milestones/v1.0-ROADMAP.md`.
- **Completed:** v1.1 — Phase **5** capture UX, Phase **6** media signal posting path, and Phase **7** E2E media trace validation.
- **Stack:** Bun, TypeScript, `bun:sqlite`, React (Bun HTML bundler), no Vite.
- **Tests:** `bun test` covers DB, orchestrator integration, fan-out, simulated node, and client API helpers.

## Next milestone goals

- Execute **v1.1** phases after `/gsd-plan-phase`.
- Optionally close **manual UAT** (e.g. `.planning/milestone-v1-UAT.md`) if you want a recorded end-to-end smoke.

## Context

This repo is a **dumbed-down** version of a **central node + webhook orchestrator + subscribers + UI** architecture to learn the flow using **Bun**, **TypeScript**, **SQLite**, **webhooks**, and **React**.

## Constraints

- **Tech stack:** Bun (not Node for app scripts), TypeScript, React for UI; SQLite via Bun for the lab.
- **Scope:** Learning clarity over feature parity; explicit, readable code paths.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite first for the lab | Simple local install; Bun’s built-in module | ✓ Shipped v1.0 |
| Simulate the “physical node” (v1.0) | Avoid hardware before the mental model is clear | ✓ `bun run simulate` |
| Add real mic/camera path (v1.1) | Prove end-to-end with actual media on the dev machine | Phase 5 shipped (capture UX); Phase 6 shipped in code (signals → events), manual runtime verification pending |
| Single Bun HTTP orchestrator | One place to log, route, and debug | ✓ `src/server.ts` |
| Bun HTML bundler for React (no Vite) | Matches stack conventions | ✓ `bun run client` |
| Dev CORS on `GET /events` | Split ports for client + API in lab | ✓ Documented in code |
| Dedicated media settings surface | Keep capture panel focused while exposing tuning/learning controls | ✓ `src/client/media-settings-page.tsx` |
| Events operator modes (tail/timeframe + pagination) | Keep large event histories usable while supporting focused temporal inspection | ✓ Virtualized + paginated events list in `src/client/events-screen.tsx` |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):

1. Move shipped requirements to **Validated** with version reference.
2. Reset **Active** for the next milestone.
3. Update **Current state** and **Next milestone goals**.
4. Audit **Out of Scope** — reasons still valid?

---

<details>
<summary>Archived: pre–v1.0 milestone Active requirements (historical)</summary>

Previously listed as Active before v1.0 close:

- **A home** can be created and named; **users** associated with that home — **addressed in v1.0** via `src/db/homes.ts` and migrations.
- **Clients** can register **subscription endpoints** — **addressed in v1.0** via `POST /subscribers` and fan-out.

</details>

---
*Last updated: 2026-04-15 — **v1.1** milestone complete (phases 5-7) with media E2E trace validated*
