# Phase 2: Webhook orchestrator - Pattern Map

**Mapped:** 2026-04-15  
**Files analyzed:** 9 (new/modified targets from `02-RESEARCH.md` + inherited Phase 1 DB contracts)  
**Analogs found:** 2 / 9 (repository application code is minimal; most patterns come from docs + `02-RESEARCH.md`)

**Note:** `02-CONTEXT.md` is absent for this phase; binding DB/FK/migration constraints are inherited from Phase 1 (`01-CONTEXT.md`) and summarized in `02-RESEARCH.md` `<user_constraints>`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/server.ts` | provider / route wiring | request-response | `index.ts` | partial (entry only; no HTTP yet) |
| `src/routes/events.ts` | route / handler | CRUD + request-response | — | none in repo |
| `src/routes/subscribers.ts` | route / handler | CRUD + request-response | — | none in repo |
| `src/webhooks/fan-out.ts` | service | batch + external HTTP (`fetch`) | — | none in repo |
| `src/db/client.ts` (or `database.ts` aligned with Phase 1 plans) | model / DB access | CRUD | — | none in repo (Phase 1 pending) |
| `src/db/migrations/00x_*.sql` (e.g. events, subscribers, optional deliveries) | migration | batch DDL | — | none in repo |
| `src/**/*.test.ts` (HTTP + fan-out integration) | test | request-response + mocked `fetch` | `.planning/codebase/TESTING.md` | doc-only |
| `package.json` (scripts / entry) | config | — | `package.json` | exact |
| `index.ts` (optional: thin re-export or replace with server entry) | entry | request-response | `index.ts` | exact (current stub) |

## Pattern Assignments

### `src/server.ts` (provider, request-response)

**Analog:** `index.ts` (only existing Bun entry)

**Current entry pattern** (lines 1–1):

```1:1:index.ts
console.log("Hello via Bun!");
```

**Interpretation for planner:** Today the project runs a **script-style** root entry with no imports. Phase 2 should introduce **`Bun.serve`** in `src/server.ts` (or migrate `index.ts` to import and start the server). New modules should use **named exports** per conventions; the server module should export a `createServer` / `start` function test harness can call. See **Shared Patterns** for TS config and HTTP error-handling norms.

**Imports / module graph:** No path aliases in `tsconfig.json` — use **relative** imports (e.g. `import { handlePostEvent } from "./routes/events.ts"`).

---

### `package.json` (config)

**Analog:** `package.json`

**Module and ESM** (lines 1–5):

```1:5:package.json
{
  "name": "home-assist",
  "module": "index.ts",
  "type": "module",
  "private": true,
```

**Interpretation:** After adding `src/server.ts`, planners typically add **`"scripts"`** (`test`, `migrate`, `dev`) and may point **`module`** or a **`dev`** script at the new entry — preserve `"type": "module"`.

---

### TypeScript project defaults (all new `.ts` files)

**Analog:** `tsconfig.json`

**Strict + verbatim imports** (lines 17–22):

```17:22:tsconfig.json
    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
```

**Bundler / imports** (lines 11–15):

```11:15:tsconfig.json
    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
```

**Apply to:** All Phase 2 TypeScript — use `import type` for type-only imports where required by `verbatimModuleSyntax`.

---

### `src/routes/events.ts` (route, CRUD + request-response)

**Analog:** None in repository.

**Planner fallback:** Implement POST/GET per **`02-RESEARCH.md`** sections *Pattern 1: HTTP routes with JSON body* and *POST `/events` payload shape* — `Bun.serve` `routes`, `await req.json()` in `try/catch`, return `Response.json` / 400 on bad JSON, validate `home_id` against `homes` or FK + `PRAGMA foreign_keys=ON`.

---

### `src/routes/subscribers.ts` (route, CRUD + request-response)

**Analog:** None in repository.

**Planner fallback:** Same HTTP patterns as `events.ts`; body shape *Subscriber registration* in `02-RESEARCH.md` *Code Examples*.

---

### `src/webhooks/fan-out.ts` (service, batch + external HTTP)

**Analog:** None in repository.

**Planner fallback:** **`02-RESEARCH.md`** *Pattern 2: Fan-out with `fetch`* — `Promise.allSettled`, optional `event_deliveries` rows for observability.

---

### `src/db/client.ts` (or `src/db/database.ts`) + migrations SQL

**Analog:** None in repository (Phase 1 `migrate` / `openDatabase` not present under `src/` yet).

**Planner fallback:** **`02-RESEARCH.md`** *Pattern 3: SQLite writes and reads* and Phase 1 decisions (D-07–D-10): versioned SQL files, `homes.id` as FK target, default `data/home-assist.sqlite`, env override. Extend the **same** migration runner Phase 1 adds — do not fork migration semantics.

---

### Integration tests (`*.test.ts`)

**Analog:** `.planning/codebase/TESTING.md` (prescriptive; no `*.test.ts` in repo yet)

**Recommended suite shape** (lines 47–52):

```47:52:.planning/codebase/TESTING.md
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

**Async tests** (lines 109–115):

```109:115:.planning/codebase/TESTING.md
import { test, expect } from "bun:test";

test("resolves data", async () => {
  const result = await Promise.resolve(42);
  expect(result).toBe(42);
});
```

**Mocking boundary** — prose (lines 64–66): mock network/filesystem/env for HTTP integrations; avoid mocking pure helpers unless isolating a failure.

**Example import** (lines 69–72):

```69:72:.planning/codebase/TESTING.md
import { test, expect, mock } from "bun:test";

// Prefer mocking at module boundaries when testing modules that call fetch or Bun.serve clients
```

Use `mock` when asserting fan-out `fetch` calls per `02-RESEARCH.md` *Validation Architecture*.

**Apply to:** HOOK-01–HOOK-04 — start `Bun.serve` on ephemeral port (`02-RESEARCH.md` *Pitfall 4*), `fetch` the API, mock `fetch` for fan-out per RESEARCH *Validation Architecture*.

---

## Shared Patterns

### Project stack (Bun, no Express)

**Source:** `.cursor/rules/gsd-project.md`  
**Apply to:** `server.ts`, routes

```10:14:.cursor/rules/gsd-project.md
### Constraints

- **Tech stack**: Bun (not Node/npm for scripts), TypeScript, React for UI; storage via Bun’s SQLite module for the lab.
- **Scope**: Learning clarity over feature parity; prefer explicit, readable code paths over microservices.
```

### Error handling and HTTP responses

**Source:** `.planning/codebase/CONVENTIONS.md`  
**Apply to:** All `Bun.serve` handlers and async fan-out

```50:58:.planning/codebase/CONVENTIONS.md
## Error Handling

**Current application code:**
- `index.ts` does not demonstrate error handling.

**Patterns to adopt (aligned with project rules in `CLAUDE.md`):**
- Prefer **`throw`** for unexpected states; catch at **HTTP route handlers**, **`Bun.serve` handlers**, or top-level `main` boundaries when those layers exist.
- For async handlers, use **`try` / `catch`** rather than floating promises.
- Return **`Response`** with appropriate status codes from route handlers rather than throwing through to the runtime when the failure is an expected HTTP error.
```

### File naming (kebab-case modules)

**Source:** `.planning/codebase/CONVENTIONS.md`

```7:9:.planning/codebase/CONVENTIONS.md
**Files:**
- TypeScript source uses `.ts` at project root today (`index.ts`). For future modules, prefer **kebab-case** file names (e.g. `user-service.ts`, `api-routes.ts`) unless adding React components, which conventionally use **PascalCase** `.tsx` per `CLAUDE.md` examples.
- Entry module is referenced as `index.ts` in `package.json` (`"module": "index.ts"`).
```

### Environment variables (no `dotenv` package)

**Source:** `02-RESEARCH.md` *Project Constraints*

Use `process.env` / `Bun.env` for `PORT`, `SQLITE_PATH` — Bun loads `.env` automatically per research.

### Foreign keys

**Source:** `01-CONTEXT.md` (D-04 FK target) + `02-RESEARCH.md` pitfalls

Enable **`PRAGMA foreign_keys = ON`** on each connection; new tables reference **`homes(id)`** for `home_id`.

---

## No Analog Found

Files with no close match **in the application tree** (planner should follow **`02-RESEARCH.md`** code examples and Phase 1 DB artifacts when they land):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/routes/events.ts` | route | CRUD + request-response | No `Bun.serve` or route modules in repo |
| `src/routes/subscribers.ts` | route | CRUD + request-response | Same |
| `src/webhooks/fan-out.ts` | service | batch + HTTP client | No `fetch`-orchestration module in repo |
| `src/db/client.ts` / `database.ts` | DB layer | CRUD | No `bun:sqlite` usage in repo yet |
| `src/db/migrations/*.sql` | migration | batch DDL | No migration files under repo root |

---

## Metadata

**Analog search scope:** `/Users/michaelweaver/Websites/home-assist/index.ts`, `package.json`, `tsconfig.json`, `.planning/codebase/{CONVENTIONS,TESTING,STACK}.md`, `.cursor/rules/gsd-project.md`; glob `**/*.{ts,tsx}` (application TS: **1 file**).  
**Files scanned:** 6+ (application + planning docs)  
**Pattern extraction date:** 2026-04-15

## PATTERN MAPPING COMPLETE

**Phase:** 02 — Webhook orchestrator  
**Files classified:** 9  
**Analogs found:** 2 / 9 (strictly in-repo TS: `index.ts` + `package.json`; tsconfig is structural analog for all TS)

### Coverage

- Files with exact analog: 1 (`package.json` → `package.json`; optional: `index.ts` → `index.ts` stub)
- Files with partial analog: 1 (`src/server.ts` → `index.ts` entry-only)
- Files with no in-repo code analog: 7 (routes, fan-out, db, migrations, integration tests — use RESEARCH + TESTING docs)

### Key Patterns Identified

- **Single entry today:** Root `index.ts` is a one-line script; Phase 2 introduces real HTTP in `src/` per RESEARCH layout.
- **TS strictness:** `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, bundler resolution — all new code must comply with `tsconfig.json`.
- **Errors:** Catch at HTTP/async boundaries; `try/catch` around `req.json()`; no floating promises on fan-out (`02-RESEARCH.md` anti-patterns).
- **Tests:** `bun:test` + ephemeral ports + optional `mock` for `fetch` — patterns documented in `TESTING.md`, not yet exemplified in code.

### File Created

`.planning/phases/02-webhook-orchestrator/02-PATTERNS.md`

### Ready for Planning

Pattern mapping complete. Planner can reference analog patterns for entry/config/TS defaults and `02-RESEARCH.md` for HTTP/SQLite/fan-out where no repo analog exists.
