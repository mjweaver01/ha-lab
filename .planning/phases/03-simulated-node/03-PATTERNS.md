# Phase 3: Simulated node - Pattern Map

**Mapped:** 2026-04-15  
**Files analyzed:** 4 (new/modified targets from `03-RESEARCH.md` + orchestrator contract from Phase 2 research)  
**Analogs found:** 2 partial / 4 total (no in-repo HTTP client, tests, or `scripts/` tree yet)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/simulated-node.ts` | utility (CLI) | request-response (outbound `fetch`) | `index.ts` | partial (Bun TS entry only; no HTTP/CLI) |
| `scripts/simulated-node.test.ts` | test | transform (pure helpers + assertions) | `.planning/codebase/TESTING.md` (prescriptive examples) | convention-doc (no `*.test.ts` in repo) |
| `package.json` | config | — | `package.json` (root) | exact |
| `README.md` (document smoke / env) | config / docs | — | `README.md` (root) | exact (extend existing) |

## Pattern Assignments

### `scripts/simulated-node.ts` (utility / CLI, request-response)

**Analog (execution / module style):** `index.ts` — only application TypeScript module today; use the same Bun + ESM assumptions.

**Minimal module / entry style** (`index.ts` lines 1-1):

```1:1:index.ts
console.log("Hello via Bun!");
```

**Apply:** Replace side-effect-only pattern with a **`main()`** (or top-level `async` IIFE) that reads env/CLI, calls `fetch`, and **`process.exit(1)`** on failure per `03-RESEARCH.md` (non-zero on HTTP errors). `index.ts` does not demonstrate this—follow **Error handling** in `CONVENTIONS.md` at the CLI boundary instead.

**Imports / TypeScript** — match `tsconfig.json` (**`verbatimModuleSyntax`**): use `import type { … } from "…"` for type-only imports when defining payload interfaces.

**Core HTTP + CLI patterns** — **no in-repo analog.** Use the concrete snippets in `03-RESEARCH.md` (POST JSON with `fetch`, `util.parseArgs` + `Bun.argv`, `ORCHESTRATOR_URL`, base URL normalization before `/events`). Mirror **Phase 2 orchestrator contract** for JSON field names (see **Shared Patterns** below).

---

### `scripts/simulated-node.test.ts` (test, transform)

**Analog:** `.planning/codebase/TESTING.md` — recommended `bun:test` shape; no `*.test.ts` files exist in the repo yet.

**Suite skeleton** (TESTING.md lines 47-53):

```47:53:.planning/codebase/TESTING.md
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

**Apply:** Import `test`, `expect` from `"bun:test"`; add tests for **URL normalization** (no double slash before `events`) and **payload factories** emitting **≥2 distinct `eventType` values** per NODE-01 (`03-RESEARCH.md` §Phase Requirements → Test Map). Use **`mock`** for `fetch` only if testing the POST path without a live server (`TESTING.md` §Mocking).

**Async tests** — follow TESTING.md lines 108-116 pattern for `async` tests.

---

### `package.json` (config)

**Analog:** `package.json` (root)

**Current module / private app metadata** (lines 1-12):

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

**Apply:** Add a **`scripts`** field (e.g. `"simulate": "bun run scripts/simulated-node.ts"` per `03-RESEARCH.md` §Wave 0 Gaps). Keep **`"type": "module"`** so ESM imports match existing config.

---

### `README.md` (documentation)

**Analog:** Root `README.md` (if present) — extend with **`ORCHESTRATOR_URL`**, **`bun run …`** smoke steps, and pointer to Phase 2 orchestrator; no code patterns required beyond matching project tone.

---

## Shared Patterns

### TypeScript compiler / imports

**Source:** `tsconfig.json`  
**Apply to:** `scripts/simulated-node.ts`, tests  

**`verbatimModuleSyntax`** (lines 14-15):

```14:15:tsconfig.json
    "verbatimModuleSyntax": true,
    "noEmit": true,
```

Use type-only imports where appropriate; align with CONVENTIONS.md §Import Organization.

---

### Error handling at CLI / main boundary

**Source:** `.planning/codebase/CONVENTIONS.md`  
**Apply to:** `scripts/simulated-node.ts`  

**Recommended pattern** (CONVENTIONS.md lines 55-58):

```55:58:.planning/codebase/CONVENTIONS.md
**Patterns to adopt (aligned with project rules in `CLAUDE.md`):**
- Prefer **`throw`** for unexpected states; catch at **HTTP route handlers**, **`Bun.serve` handlers**, or top-level `main` boundaries when those layers exist.
- For async handlers, use **`try` / `catch`** rather than floating promises.
```

Wrap the `fetch` + response check in `try/catch`; on non-2xx, print response body and exit with non-zero status (`03-RESEARCH.md` §Common Pitfalls).

---

### Logging (until a logger exists)

**Source:** `.planning/codebase/CONVENTIONS.md`  
**Apply to:** CLI script  

**Console usage** (CONVENTIONS.md lines 62-66):

```62:66:.planning/codebase/CONVENTIONS.md
**Current state:**
- `index.ts` uses **`console.log`** for a one-line hello message.

**Project guidance (`CLAUDE.md`):**
- Prefer structured or leveled logging when the app grows; until a logger is introduced, **`console`** usage is acceptable for development. Avoid logging secrets or full request bodies containing credentials.
```

---

### File naming for non-React modules

**Source:** `.planning/codebase/CONVENTIONS.md`  
**Apply to:** new files under `scripts/`  

**Kebab-case** (CONVENTIONS.md lines 7-9):

```7:9:.planning/codebase/CONVENTIONS.md
**Files:**
- TypeScript source uses `.ts` at project root today (`index.ts`). For future modules, prefer **kebab-case** file names (e.g. `user-service.ts`, `api-routes.ts`) unless adding React components, which conventionally use **PascalCase** `.tsx` per `CLAUDE.md` examples.
- Entry module is referenced as `index.ts` in `package.json` (`"module": "index.ts"`).
```

`simulated-node.ts` and `simulated-node.test.ts` match kebab-case + co-located test naming from `TESTING.md`.

---

### Orchestrator POST body alignment (producer vs consumer)

**Source (contract — Phase 2 research):** `.planning/phases/02-webhook-orchestrator/02-RESEARCH.md`  
**Source (client illustration — Phase 3 research):** `03-RESEARCH.md`  

Phase 2 research illustrates **`home_id` (number)**, **`event_type`**, optional **`body`** (illustrative interface under “POST `/events` payload shape”):

```244:248:.planning/phases/02-webhook-orchestrator/02-RESEARCH.md
interface PostEventBody {
  home_id: number;
  event_type: string;
  body?: unknown; // JSON object or primitive; store as TEXT JSON in SQLite
}
```

Phase 3 research uses **`homeId` / `eventType`** in examples (`03-RESEARCH.md` §Canonical payload shape). **Planner must pick one shape** consistent with the implemented Phase 2 handler once it exists; centralize in one module and adjust the simulated node to match (see `03-RESEARCH.md` §Anti-Patterns / Open Questions).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Outbound `fetch` POST JSON | — | request-response | No HTTP client code in repo; use `03-RESEARCH.md` + Bun docs; align fields with Phase 2 implementation. |
| `util.parseArgs` CLI | — | request-response | No CLI scripts; use `03-RESEARCH.md` Pattern 2 + `node:util`. |

## Metadata

**Analog search scope:** project root `*.ts`, `package.json`, `tsconfig.json`, `.planning/codebase/TESTING.md`, `.planning/codebase/CONVENTIONS.md`, `.planning/phases/02-webhook-orchestrator/02-RESEARCH.md`  
**Files scanned:** 1 TypeScript application file (`index.ts`)  
**Pattern extraction date:** 2026-04-15  

---

## PATTERN MAPPING COMPLETE

**Phase:** 03 — Simulated node  
**Files classified:** 4  
**Analogs found:** 2 partial / 4 (CLI + tests have no first-class code analogs; conventions + Phase 2 research fill the gap)

### Coverage

- Files with exact analog: 1 (`package.json` self-pattern; README as doc extend)
- Files with role-match / partial analog: 1 (`index.ts` → thin Bun module only)
- Files with convention-doc / cross-phase analog: 1 (`TESTING.md` for `bun:test`)
- Files relying on research + Phase 2 contract: 1 (`simulated-node.ts` HTTP/CLI)

### Key Patterns Identified

- **Single TS file today:** `index.ts` is minimal; new CLI should still respect **ESM**, **`tsconfig` strictness**, and **kebab-case** `scripts/` filenames per `CONVENTIONS.md`.
- **Tests:** No existing `*.test.ts`; follow **`bun:test`** import and structure from **`TESTING.md`**.
- **Orchestrator payload names:** Reconcile **`02-RESEARCH.md`** (`home_id` / `event_type`) with **`03-RESEARCH.md`** examples (`homeId` / `eventType`) when Phase 2 code lands.
- **Cross-cutting:** **`try/catch` at CLI boundary**, **`console`** for non-secret diagnostics, **`package.json` `scripts`** for `bun run` entry.

### File Created

`.planning/phases/03-simulated-node/03-PATTERNS.md`

### Ready for Planning

Pattern mapping complete. Planner can reference analog patterns and Phase 2 POST body illustration when writing `PLAN.md` files.
