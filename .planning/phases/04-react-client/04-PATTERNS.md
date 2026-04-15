# Phase 4: React client — Pattern Map

**Mapped:** 2026-04-15  
**Files analyzed:** 8 (implied new/modified from `04-UI-SPEC.md`, `STACK.md`, `ROADMAP.md` phase 4)  
**Analogs found:** 3 partial codebase matches / 8 (no existing React; conventions + config only)  
**Note:** `04-RESEARCH.md` was not present in `.planning/phases/04-react-client/` — planner should treat `04-UI-SPEC.md` and `.planning/codebase/STACK.md` as primary technical references until research is added.

---

## File Classification

| New/Modified File (typical) | Role | Data Flow | Closest Analog | Match Quality |
|-----------------------------|------|-----------|----------------|---------------|
| `tsconfig.json` (extend if needed) | config | static | `tsconfig.json` | exact (JSX already set) |
| Client entry (e.g. `main.tsx` / `client.tsx`) | component / bootstrap | event-driven (mount) | `index.ts` | partial (script entry only) |
| Events screen (e.g. `Events.tsx`) | component | request-response + polling | — | none (no `.tsx` yet) |
| Polling hook (e.g. `use-events-poll.ts` / `.tsx`) | hook | event-driven (interval) | — | none |
| API/types helper (e.g. `events-api.ts`, types for list DTOs) | service / utility | CRUD (read) + transform | — | none |
| Global or co-located CSS (e.g. `events.css` / `app.css`) | config / style | static | — | none |
| `package.json` (add `react`, `react-dom`, types) | config | static | `package.json` | partial |
| Tests (e.g. `*.test.ts` for pure helpers or fetch wrapper) | test | batch | `.planning/codebase/TESTING.md` pattern | doc-match |

---

## JSX / TypeScript: `react-jsx` (project already configured)

**Analog:** `tsconfig.json`

The repo already enables the automatic JSX runtime (no `import React from "react"` required for JSX). New `.tsx` files should align with these compiler options:

**JSX + module settings** (lines 1–15):

```1:15:/Users/michaelweaver/Websites/home-assist/tsconfig.json
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
```

**Strictness and indexing** (lines 17–22) — applies to all new TS/TSX:

```17:22:/Users/michaelweaver/Websites/home-assist/tsconfig.json
    // Best practices
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
```

**Planner actions:** Keep `jsx: "react-jsx"`; add `"lib": ["ESNext", "DOM"]` (and optionally `"DOM.Iterable"`) when introducing browser APIs so `document`, `fetch`, and `setInterval` type-check. Respect **`verbatimModuleSyntax: true`** — use `import type { … }` for type-only imports from React or local types.

---

## Pattern Assignments

### Client entry (`main.tsx` or similar) (component / bootstrap, event-driven)

**Analog:** `index.ts` (minimal ESM entry; not React)

**Current entry pattern** (lines 1–1):

```1:1:/Users/michaelweaver/Websites/home-assist/index.ts
console.log("Hello via Bun!");
```

**Convention (naming + default export):** `.planning/codebase/CONVENTIONS.md` states React components use **PascalCase** `.tsx`; **default export is acceptable for React root components** per project guidance embedded in `.cursor/rules/gsd-project.md` (sourced from conventions). Prefer **named exports** for non-root modules as the tree grows.

**Core pattern to adopt:** `createRoot` from `react-dom/client`, mount once, no full page navigation on poll updates (per **UI-02** in `04-UI-SPEC.md`).

---

### `Events.tsx` (component, request-response + polling)

**Analog:** none in repo (no `.tsx` files).

**Follow instead:**

- **Visual/copy contract:** `04-UI-SPEC.md` — single column; spacing tokens (xs–xl); colors (`#0f1419`, `#1a2332`, `#3d8bfd` accent for new rows); copy for empty/error/CTA (“Refresh events”, “No events yet”, etc.).
- **Behavior:** Poll every **3–5s** (configurable); highlight “new” events since last poll (accent border or badge).
- **TypeScript:** Strict null handling; narrow optional API fields because `noUncheckedIndexedAccess` is on.

---

### Polling hook / API module (hook + service, event-driven + read)

**Analog:** none.

**Follow instead:**

- **Error handling:** `.planning/codebase/CONVENTIONS.md` — `try`/`catch` in async paths; surface user-facing message matching UI-SPEC error copy (“Could not load events…”).
- **Fetch:** No existing `fetch` wrapper in app code (per `INTEGRATIONS.md`); implement a small typed function (base URL from env or config constant).

---

### `package.json` (config)

**Analog:** `package.json`

**Current dependencies** (lines 1–12):

```1:12:/Users/michaelweaver/Websites/home-assist/package.json
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

**Pattern:** `"type": "module"` — keep ESM. Phase execution will add `react`, `react-dom`, and typically `@types/react` / `@types/react-dom` as devDependencies; pin versions per UI-SPEC registry note (npm-only, pin in `package.json`).

---

### Tests (`*.test.ts` / `*.tsx`)

**Analog:** documented pattern in `.planning/codebase/TESTING.md` (no tests in tree yet)

**Recommended shape:**

```48:52:/Users/michaelweaver/Websites/home-assist/.planning/codebase/TESTING.md
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

**Apply to:** Pure functions (e.g. parsing API JSON, “is this event id newer than last seen”) with `bun:test`; mock `fetch` at boundaries per TESTING.md.

---

## Shared Patterns

### Imports and path aliases

**Source:** `.planning/codebase/CONVENTIONS.md` (lines 40–48)

- No `compilerOptions.paths` in `tsconfig.json` — use **relative imports** unless paths are added later.
- Order: external packages → type-only imports → relative `./` / `../`.

### `verbatimModuleSyntax` (type-only imports)

**Source:** `tsconfig.json` (lines 12–13) and CONVENTIONS.md

Use `import type { FC } from "react"` (or `import { type X }`) so type-only imports stay erasure-safe under `verbatimModuleSyntax: true`.

### Stack constraints (Bun, no Vite called out in codebase docs)

**Source:** `.planning/codebase/STACK.md`

- Bundle/serve with **Bun**; `CLAUDE.md` is referenced in STACK for `Bun.serve()` and HTML route imports when the server ships — align the React bundle injection with that doc when the orchestrator + static client are wired.

### UI tokens (single source for styling)

**Source:** `04-UI-SPEC.md`

Spacing, typography, color roles, and CTA/error copy are fixed; implement with plain CSS (no component library per contract).

---

## No Analog Found

| File / area | Role | Data Flow | Reason |
|-------------|------|-----------|--------|
| `*.tsx` components | component | request-response / UI state | No `.tsx` / `.jsx` in repository |
| React hooks | hook | interval / state | No hooks present |
| CSS modules / global lab theme | style | static | No stylesheets yet |

Use **`04-UI-SPEC.md`** + **`STACK.md`** + **`tsconfig.json`** until in-repo React examples exist.

---

## Metadata

**Analog search scope:** Repository root (`*.ts`, `*.tsx`, `tsconfig.json`, `package.json`); `.planning/codebase/*.md`  
**Files scanned:** `index.ts`, `tsconfig.json`, `package.json`, glob `**/*.{tsx,jsx}` (0 files)  
**Pattern extraction date:** 2026-04-15  

---

## PATTERN MAPPING COMPLETE

**Phase:** 4 — React client  
**Files classified:** 8  
**Analogs found:** 3 / 8 (partial matches: `tsconfig.json`, `package.json`, `index.ts`; conventions/testing docs fill gaps)

### Coverage

- Files with exact analog: 1 (`tsconfig.json` for JSX/compiler baseline)
- Files with role-match / partial analog: 2 (`package.json`, `index.ts`)
- Files with no analog: 5 (all React-specific artifacts)

### Key Patterns Identified

- **JSX:** `jsx: "react-jsx"` already set — use automatic JSX runtime; extend `lib` for DOM when adding client code.
- **Types:** `strict`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess` — type-only imports and careful null/array access in event lists.
- **UI:** Phase 4 contract is **functional React + minimal CSS**, single **Events** screen, **3–5s polling**, no full reload on new data.
- **Tests:** `bun:test` + `expect`; co-locate `*.test.ts` per TESTING.md.
- **Dependencies:** ESM (`"type": "module"`); add React packages explicitly; pin versions.

### File Created

`.planning/phases/04-react-client/04-PATTERNS.md`

### Ready for Planning

Pattern mapping complete. Planner can reference `tsconfig.json` JSX settings, `package.json` ESM layout, `index.ts` as stub entry analog, and `04-UI-SPEC.md` for all React/UI specifics; supplement with `04-RESEARCH.md` when available.
