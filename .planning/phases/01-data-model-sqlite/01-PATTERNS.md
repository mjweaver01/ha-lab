# Phase 1: Data model & SQLite - Pattern Map

**Mapped:** 2026-04-15  
**Files analyzed:** 8 (new/modified scope from CONTEXT + RESEARCH)  
**Analogs found:** 0 / 8 (greenfield DB layer — see below)

## Greenfield note

Application code today is **`index.ts` only** (one-line script). There is **no** existing SQLite, migration runner, or `bun:test` file. Planners should treat database modules as **new** and take **DDL, migration runner shape, and integration test flow** from **`01-RESEARCH.md`** (especially “Architecture Patterns”, “Code Examples”, and “Pattern 1/2”). For **TypeScript style, imports, and test harness**, copy from **`tsconfig.json`**, **`.planning/codebase/CONVENTIONS.md`**, and **`.planning/codebase/TESTING.md`**.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/database.ts` (or `db/database.ts`) | service + config | file I/O → SQLite (open, pragmas, path) | *none* | greenfield — use RESEARCH Pattern 1 + D-09/D-10 |
| `src/db/migrate.ts` | utility / migration runner | batch (ordered SQL files, transactional) | *none* | greenfield — use RESEARCH Pattern 2 |
| `src/db/migrations/001_initial.sql` | migration | DDL (schema bootstrap) | *none* | greenfield — use RESEARCH suggested DDL + CONTEXT D-01–D-06 |
| `src/db/migrate.test.ts` (or co-located `*.test.ts`) | test | integration (persist + reopen) | *none* | greenfield — use TESTING.md + RESEARCH persistence example |
| Optional: `src/db/queries.ts` (or inline helpers in test) | service | CRUD (insert/select) | *none* | greenfield — parameterized `db.query` per RESEARCH |
| `package.json` | config | — | `package.json` (existing) | exact (extend scripts) |
| `.gitignore` | config | — | `.gitignore` (existing) | exact (`data/` already listed) |
| `index.ts` (optional wire-up) | entry | — | `index.ts` | exact (minimal — avoid growing until needed) |

## Pattern Assignments

### `src/db/database.ts` (service + config, file I/O)

**Analog:** *No database module in repo.* Use **`01-RESEARCH.md`** — “Pattern 1: Enable foreign keys on every connection” and “Recommended Project Structure”.

**TypeScript / module conventions** — match **`tsconfig.json`** (strict, `verbatimModuleSyntax`, bundler imports):

```1:28:tsconfig.json
{
  "compilerOptions": {
    // Environment setup & latest features
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,

    // Bundler mode
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,

    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
```

**Naming:** Prefer **kebab-case** `.ts` filenames for non-React modules per **`.planning/codebase/CONVENTIONS.md`** (e.g. `database.ts`, `migrate.ts`).

**Imports (prescriptive order when file grows):** external / `bun:*` first, then relative — per CONVENTIONS “Import Organization” (lines 40–48).

---

### `src/db/migrate.ts` (utility, batch migrations)

**Analog:** *None.* Implement idempotent runner + `schema_migrations` as in **`01-RESEARCH.md`** — “Pattern 2: Migration runner with `schema_migrations`” and transaction wrapping (`db.transaction`).

**Error handling (project-wide guidance until HTTP layer exists):** prefer **`throw`** for unexpected states; catch at top-level or test boundaries — **`.planning/codebase/CONVENTIONS.md`** lines 50–57.

---

### `src/db/migrations/001_initial.sql` (migration, DDL)

**Analog:** *None.* Encode **CONTEXT** D-01–D-06 (tables `users`, `homes`, junction with `UNIQUE(home_id, user_id)`, integer PKs, optional `display_name`, `created_at`). Reference DDL sketch in **`01-RESEARCH.md`** “Suggested DDL aligned with CONTEXT (illustrative)”.

---

### `src/db/migrate.test.ts` (test, integration)

**Analog:** *No test files yet.* Use **`bun:test`** entry pattern from **`.planning/codebase/TESTING.md`** (“Recommended suite shape”, ~lines 48–52):

```typescript
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

**Persistence requirement (D-11):** temp **file** path, `close()`, reopen second `Database` — follow **`01-RESEARCH.md`** “Integration test: persistence across ‘restart’” (TypeScript block under that heading).

**Co-location:** Prefer **`{module}.test.ts`** next to the module per TESTING.md “Test File Organization”.

---

### `package.json` (config)

**Analog:** `package.json`

**Current module entry (keep consistency if adding scripts only):**

```1:12:package.json
{
  "name": "home-assist",
  "module": "index.ts",
  "type": "module",
  "private": true,
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5"
  }
}
```

**Planner action:** add `"scripts"` (e.g. `"test": "bun test"`) as optional discoverability — aligns with RESEARCH “Wave 0 Gaps” / TESTING run commands.

---

### `.gitignore` (config)

**Analog:** `.gitignore`

**Existing `data/` ignore (D-09 — already satisfied):**

```4:7:.gitignore
# local SQLite (Phase 1+)
data/

# output
```

---

### `index.ts` (entry — optional touch)

**Analog:** `index.ts`

**Established minimal entry (do not over-expand for Phase 1 unless PLAN requires a CLI):**

```1:1:index.ts
console.log("Hello via Bun!");
```

---

## Shared Patterns

### Strict TypeScript and type-only imports

**Source:** `tsconfig.json` (`strict`, `verbatimModuleSyntax`)  
**Apply to:** All new `.ts` files  
**Rule:** Use `import type { X }` for type-only imports per CONVENTIONS.

### Bun SQLite and pragmas

**Source:** *No repo code —* **`01-RESEARCH.md`** Pattern 1–2  
**Apply to:** `database.ts`, `migrate.ts`, tests  
**Summary:** `import { Database } from "bun:sqlite"`; `PRAGMA foreign_keys = ON` after open; wrap each migration apply + version insert in `db.transaction()`.

### Assertions and test discovery

**Source:** `.planning/codebase/TESTING.md`  
**Apply to:** `*.test.ts`  
**Run:** `bun test`, `bun test path/to/file.test.ts`

### Logging

**Source:** `.planning/codebase/CONVENTIONS.md` (Logging section)  
**Apply to:** Migration runner / DB helpers until a logger exists  
**Guidance:** `console` acceptable for dev; avoid logging secrets.

## No Analog Found (use RESEARCH.md for implementation detail)

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `database.ts` | service + config | file I/O | First DB opener; no prior `bun:sqlite` usage |
| `migrate.ts` | utility | batch | No migration runner |
| `001_initial.sql` | migration | DDL | No SQL migrations in repo |
| `migrate.test.ts` | test | integration | No `*.test.ts` files yet |
| Optional query helpers | service | CRUD | No data access layer |

## Metadata

**Analog search scope:** `/Users/michaelweaver/Websites/home-assist` — `index.ts`, `package.json`, `tsconfig.json`, `.gitignore`, `.planning/codebase/*.md`  
**Files scanned:** 6 TypeScript/config files at project root + planning docs  
**Pattern extraction date:** 2026-04-15

## PATTERN MAPPING COMPLETE
