# Phase 1: Data model & SQLite - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver **persistent homes and user–home membership** in local SQLite so later phases (webhook orchestrator, simulated node, React client) can rely on **stable `home_id` and `user_id`**. This phase does **not** implement the RPi node, Buildroot, HomeKit, mobile apps, real auth, or the webhook HTTP service—those are dumbed down or deferred per roadmap.

**User intent (why this shape):** The reference architecture is a **central home instance** (their world: RPi + Buildroot) emitting events into a **high-level webhook orchestrator** that fans out to **subscribers**, with **users who belong to a home** receiving alerts. This lab collapses that to: **SQLite IDs for homes and members first**, then orchestrator + webhooks + UI in later phases.

</domain>

<decisions>
## Implementation Decisions

### 1. User identity in the DB (HOME-02)

- **D-01:** `users` table with `id INTEGER PRIMARY KEY AUTOINCREMENT` as the stable identifier for membership and future “alert recipient” references.
- **D-02:** Add optional `display_name TEXT` (nullable) for developer/debug labeling only—**no passwords, OAuth, or sessions** in Phase 1 (aligns with PROJECT.md “minimal auth / dev tokens later”).
- **D-03:** Do **not** require UUIDs in v1; integer primary keys are preferred for simplicity. Optional migration to UUIDs can align with **POSTGRES-01** later if needed.

### 2. Home and membership shape (HOME-01, HOME-02)

- **D-04:** `homes` table: at minimum `id`, `name` (non-empty string), and `created_at` (ISO-friendly stored type).
- **D-05:** Membership as a **many-to-many** junction table (e.g. `home_members` or `home_users`): `home_id`, `user_id`, **`UNIQUE(home_id, user_id)`**, and `created_at`.
- **D-06:** **No roles or permissions** in Phase 1 unless a later phase requires them—membership is binary (user belongs to home or not).

### 3. Schema evolution (migrations vs bootstrap)

- **D-07:** Use **versioned SQL migration files** (numeric prefix, e.g. `001_initial.sql`, `002_...sql`) applied by a **small runner** in TypeScript using `bun:sqlite`, so the learning path is explicit and diffable (matches PROJECT.md “readable code paths”).
- **D-08:** Avoid a single opaque “magic” bootstrap with no history; new schema changes add a new migration file.

### 4. Database file location and configuration

- **D-09:** Default SQLite file path: **`data/home-assist.sqlite`** (relative to project root). Ensure **`data/` is gitignored** so local DB files are not committed.
- **D-10:** Support an **environment override** (e.g. `SQLITE_PATH` or `DATABASE_URL` pointing at a file path) so paths stay flexible on different machines; Bun loads `.env` automatically per project conventions.

### 5. Proof for success criteria (script vs test)

- **D-11:** At least one **`bun test`** integration test that: (1) applies migrations, (2) creates a home, (3) creates a user, (4) attaches membership, (5) reopens the DB (or new connection) and verifies rows persist—covers roadmap “short script or API test” and **data survives process restart**.
- **D-12:** Optional: a small **`bun run`** script for manual exploration (not required for phase success if the test is present).

### Claude's Discretion

- Exact migration directory name (`db/migrations/` vs `migrations/`), table naming (`home_members` vs `memberships`), and whether to enable SQLite **WAL** pragma for dev convenience.
- Exact TypeScript API surface for “create home + attach user” (thin `lib/db.ts` vs inline in test) as long as behavior matches decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and requirements

- `.planning/ROADMAP.md` — Phase 1 goal, HOME-01 / HOME-02, success criteria 1–3.
- `.planning/REQUIREMENTS.md` — HOME-01, HOME-02; v2 **POSTGRES-01** / **AUTH-01** for future parity.
- `.planning/PROJECT.md` — Vision, stack constraints (Bun, TypeScript, SQLite for lab), out-of-scope items (HomeKit, native apps, production Postgres in v1).

### Codebase and conventions

- `.planning/codebase/STACK.md` — Bun, `bun:sqlite`, `bun:test`.
- `.planning/codebase/CONVENTIONS.md` — Strict TS, `verbatimModuleSyntax`, import style.
- `CLAUDE.md` — Prefer Bun APIs (`bun:sqlite`), no `dotenv` (Bun loads `.env`).

### Testing

- `.planning/codebase/TESTING.md` — Project testing expectations for `bun:test` when implementing verification.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `index.ts` — Minimal entry; Phase 1 will add DB modules, migration runner, and tests alongside or under a clear folder (e.g. `src/` or `db/`).

### Established Patterns

- No database layer yet; follow **strict TypeScript** and **kebab-case** file names for non-React modules per `CONVENTIONS.md`.

### Integration Points

- Future Phase 2 will reference `homes.id` and membership; keep foreign keys and IDs stable and obvious in schema.

</code_context>

<specifics>
## Specific Ideas

- **Mental model:** “Central node” (their RPi/home instance) → events in the real product eventually reach a **webhook orchestrator**; **users in a home** get alerts. This repo **dumbs that down**: SQLite homes/users in Phase 1, orchestrator in Phase 2, simulated node in Phase 3, React in Phase 4.
- **Employer stack alignment:** Production uses **Postgres**; this lab uses **`bun:sqlite`** first; optional Postgres swap is explicitly deferred (**POSTGRES-01**).

</specifics>

<deferred>
## Deferred Ideas

- **Real central node / Buildroot / RPi images** — Out of scope; simulated node in Phase 3.
- **HomeKit, iOS/Android, native clients** — Out of scope for v1; web only in Phase 4.
- **Webhook orchestrator HTTP API, fan-out, subscribers** — Phases 2–4; not Phase 1.
- **Real auth (OAuth, sessions)** — AUTH-01 / v2; Phase 1 uses in-DB user rows only.

### Reviewed Todos (not folded)

- None (no matching todos for Phase 1).

</deferred>

---

*Phase: 01-data-model-sqlite*
*Context gathered: 2026-04-15*
