# Phase 1: Data model & SQLite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 1 — Data model & SQLite
**Areas discussed:** User identity, Home & membership shape, Schema evolution, DB file location, Proof (test vs script)

---

## 1. User identity in the DB

| Option | Description | Selected |
|--------|-------------|----------|
| Integer PK + optional display | `users` with `INTEGER PRIMARY KEY AUTOINCREMENT`, optional `display_name` for dev/debug | ✓ |
| UUID strings | Closer to some distributed systems; more complexity for v1 | |
| Email required | Premature for Phase 1 auth | |

**User's choice:** Align with lab simplicity: integer users, optional label, no auth in Phase 1.
**Notes:** User described employer stack (Postgres, Bun, webhooks, React) and learning goal; SQLite stands in for Postgres until POSTGRES-01.

---

## 2. Home and membership shape

| Option | Description | Selected |
|--------|-------------|----------|
| homes + junction M:N | `homes` with at least id, name, created_at; junction with UNIQUE(home_id, user_id) | ✓ |
| Roles on membership | e.g. admin/member | Deferred |

**User's choice:** Binary membership; no roles in Phase 1.
**Notes:** Maps to “users that are part of the home” for future alerts without role modeling.

---

## 3. Schema evolution

| Option | Description | Selected |
|--------|-------------|----------|
| Versioned SQL + runner | Numbered migration files + TS runner using `bun:sqlite` | ✓ |
| Single bootstrap only | One script, no history | |

**User's choice:** Explicit migrations for clarity and teachability.

---

## 4. Database file location

| Option | Description | Selected |
|--------|-------------|----------|
| `data/home-assist.sqlite` + env override | Default under repo; env for path; `data/` gitignored | ✓ |
| In-memory only | Fails “survives restart” | |

**User's choice:** On-disk file with configurable path.

---

## 5. Proof for success criteria

| Option | Description | Selected |
|--------|-------------|----------|
| `bun test` integration + optional script | Test covers create + membership + persistence across restart | ✓ |
| Script only | Allowed by roadmap but weaker for regression | |

**User's choice:** Require automated test; optional manual script.

---

## Claude's Discretion

- Migration folder naming, WAL pragma, exact module layout.

## Deferred Ideas

- RPi/Buildroot, HomeKit, mobile, full orchestrator, production Postgres — per roadmap / PROJECT.md.
