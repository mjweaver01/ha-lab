# Home Assist Lab

## What This Is

A **personal learning prototype** of a simplified “central home + webhook + alerts” model inspired by a commercial product: a Raspberry Pi–style “home” node (simulated on your Mac), a small **webhook orchestrator** that receives events from that node and fans them out to subscribers, and a **web client** so people in a home can see activity and get alerts. It is intentionally **not** HomeKit, iOS/Android apps, or production Buildroot—just enough Bun + TypeScript + storage + React to understand the flow.

## Core Value

You can **end-to-end trace one event** from “something happened on the node” → “orchestrator received and routed it” → “a subscribed user sees an alert”.

## Requirements

### Validated

- ✓ **Bun + TypeScript scaffold** — Existing repo runs `index.ts` with Bun; `tsconfig` and `package.json` are in place (see `.planning/codebase/STACK.md`).
- ✓ **GSD planning tooling** — `.cursor/get-shit-done/` and `.planning/codebase/` maps exist for workflows and AI-assisted planning.
- ✓ **Webhook orchestrator (Phase 2)** — `Bun.serve` HTTP API: POST/GET `/events`, POST `/subscribers`, fan-out with delivery records (`HOOK-01`–`HOOK-04`).
- ✓ **Simulated node (Phase 3)** — `bun run simulate` POSTs `PostEventBody` samples to the orchestrator (`NODE-01`).

### Active

- [ ] **A** home (logical “site”) can be created and named; users can be associated with that home.
- [ ] **Clients** can register **subscription endpoints** (e.g. URLs) or in-app channels for events for a home.
- [ ] A **React UI** lists recent events and shows alerts for users in a home.

### Out of Scope

- **Real Raspberry Pi / Buildroot images** — Use your dev machine as the “node” for simulation.
- **Home Assistant, HomeKit, Matter, native iOS/Android** — Not in v1; web only.
- **Production Postgres** — Prefer `bun:sqlite` for the lab; Postgres remains an optional later swap if you want parity with the employer stack.
- **Multi-tenant SaaS hardening** — Auth can be minimal (e.g. dev tokens); no enterprise compliance story in v1.

## Context

You are joining a company whose product uses a **central node** (RPi, home instance, Buildroot), **off-the-shelf sensors/cameras**, and a **high-level webhook orchestrator** that turns home assistant–style events into webhook deliveries to whoever is subscribed; home members get alerts. This repo is your **dumbed-down** version to learn the architecture: **node → orchestrator → subscribers → UI**, using **Bun**, **TypeScript**, **SQLite** (via Bun), **webhooks**, and **React** for the client.

## Constraints

- **Tech stack**: Bun (not Node/npm for scripts), TypeScript, React for UI; storage via Bun’s SQLite module for the lab.
- **Scope**: Learning clarity over feature parity; prefer explicit, readable code paths over microservices.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite first for the lab | Matches “simple local install” and Bun’s built-in module; easy to run locally | — Pending |
| Simulate the “physical node” | Avoids hardware before the mental model is clear | — Pending |
| Webhook orchestrator as single Bun HTTP service | One place to log, route, and replay events for debugging | Implemented (Phase 2) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-15 after Phase 3 (simulated node) completion*
