# Coding Conventions

**Analysis Date:** 2026-04-15

## Naming Patterns

**Files:**
- Use kebab-case for source and test files (examples: `src/client/lib/media-learning.ts`, `src/client/media-capture-section.test.tsx`).
- Co-locate tests next to implementation and append `.test` before extension (examples: `src/client/lib/events-view.ts` + `src/client/lib/events-view.test.ts`).
- Use domain folder grouping rather than type-only folders (examples: `src/client/api/`, `src/client/hooks/`, `src/client/lib/`, `src/routes/`, `src/webhooks/`, `src/db/`).

**Functions:**
- Use camelCase for functions and hooks (examples: `createServer()` in `src/server.ts`, `useEventsPoll()` in `src/client/hooks/use-events-poll.ts`).
- Prefix React hooks with `use` and return structured object APIs (example: `useMediaCapture()` in `src/client/hooks/use-media-capture.ts`).
- Use verb-first names for side-effect operations (examples: `deliverEventToSubscribers()` in `src/webhooks/fan-out.ts`, `saveMediaDetectionSettings()` in `src/client/lib/media-settings.ts`).

**Variables:**
- Use camelCase locals/state, with concise semantic names (`baseUrl`, `locationId`, `pollMs`) in `src/client/hooks/use-events-poll.ts`.
- Use UPPER_SNAKE_CASE for module constants (`AUDIO_THROTTLE_MS`, `VIDEO_IDLE_LABEL`) in `src/client/hooks/use-media-capture.ts`.
- Use suffixes that encode type/units (`nowMs`, `startMs`, `dbPath`) in `src/client/lib/events-view.ts` and `src/db/migrate.test.ts`.

**Types:**
- Export explicit `type` aliases for payload contracts and component props (`PostEventBody` in `src/types/events-api.ts`, `EventsScreenProps` in `src/client/events-screen.tsx`).
- Use union literals for closed sets (`EventsFilterMode`, `TimeRangePreset`) in `src/client/lib/events-view.ts`.

## Code Style

**Formatting:**
- No dedicated Prettier config detected (`.prettierrc*` not present); style is enforced by repository consistency.
- Keep trailing commas in multiline literals/calls (pattern visible in `src/server.ts` and `src/client/events-screen.tsx`).
- Prefer double quotes for strings and explicit semicolons across all modules (examples in `src/routes/events.ts`, `src/client/api/events-client.ts`).

**Linting:**
- No ESLint/Biome config detected (`eslint.config.*`, `.eslintrc*`, `biome.json` not present).
- Use TypeScript strictness as primary static quality gate (`"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true` in `tsconfig.json`).
- Keep runtime guards even with TypeScript types (examples: `parsePostEventBody()` in `src/routes/events.ts`, `parseEventRow()` in `src/client/api/events-client.ts`).

## Import Organization

**Order:**
1. External runtime/platform imports first (`bun:test`, `react`, `node:*`) as in `src/client/hooks/use-media-capture.test.ts` and `src/db/migrate.ts`.
2. Internal value imports second (examples: `fetchEvents` in `src/client/hooks/use-events-poll.ts`, `openDatabase` in `src/server.ts`).
3. Type imports grouped with `import type` either standalone or mixed in a nearby block (examples: `src/server.ts`, `src/client/events-screen.tsx`).

**Path Aliases:**
- Path aliases are not used; prefer explicit relative imports with `.ts`/`.tsx` extensions (examples: `./events-screen.tsx` in `src/client/main.tsx`, `../db/migrate.ts` in `src/webhooks/fan-out.test.ts`).

## Error Handling

**Patterns:**
- Wrap untrusted parsing/I/O in `try/catch` and return stable fallback behavior (examples: JSON parse guards in `src/routes/events.ts` and `src/client/lib/media-settings.ts`).
- Convert unknown errors into user-facing messages with consistent fallback text (examples: `formatMediaError()` in `src/client/lib/media-errors.ts`, network error wrapping in `src/client/api/events-client.ts`).
- Validate request and query inputs early; return typed HTTP errors (`400`, `404`) from route handlers in `src/routes/events.ts` and `src/routes/subscribers.ts`.

## Logging

**Framework:** `console` (`console.log` / `console.error`)

**Patterns:**
- Use structured operational logs at server boundaries (request method/path/status/latency in `src/server.ts`).
- Use CLI stderr + non-zero exit for script failures (`scripts/simulated-node.ts`), and stdout for success summaries.

## Comments

**When to Comment:**
- Add short rationale comments for non-obvious behavior, especially cadence/contract constraints (examples in `src/client/hooks/use-media-capture.ts` and `src/client/lib/media-signals.ts`).
- Use module-level JSDoc blocks for contract ownership and coupling notes (examples in `src/client/api/events-client.ts`, `src/types/events-api.ts`, `src/server.ts`).

**JSDoc/TSDoc:**
- Use lightweight JSDoc for exported APIs and behavioral notes; avoid heavy per-line comments when code is clear.

## Function Design

**Size:** 
- Keep utility functions small and single-purpose in `src/client/lib/` (for example `computeVirtualWindow()` and `paginateEvents()` in `src/client/lib/events-view.ts`).
- Complex side-effect hooks can be large but partition logic into named callbacks and cleanup sections (pattern in `src/client/hooks/use-media-capture.ts`).

**Parameters:** 
- Prefer object parameters for multi-option APIs (`createServer(options?)` in `src/server.ts`, `createMediaSignalPipeline(options)` in `src/client/lib/media-signals.ts`).
- Use explicit scalar parameters for pure helpers where ordering is clear (`paginateEvents(events, page, pageSize)` in `src/client/lib/events-view.ts`).

**Return Values:** 
- Return explicit typed objects for hook/component contracts (`useEventsPoll()` and `useMediaCapture()`).
- Use boolean/nullable returns to communicate acceptance/failure in processing pipelines (`handleAudioClassification()` returns `Promise<boolean>` in `src/client/lib/media-signals.ts`).

## Module Design

**Exports:**
- Prefer named exports; default exports are not used in examined source files (`src/client/lib/*`, `src/routes/*`, `src/db/*`, `src/webhooks/*`).
- Keep side effects behind function calls except explicit entrypoints (`index.ts` and `src/db/migrate.ts` via `import.meta.main`).

**Barrel Files:**
- Barrel files are not used; import from concrete module paths directly.

## UI Styling

**Shared Primitive Rule:**
- Use shared `ui-*` classes from `src/client/styles.css` for base UI elements (pages, headers, panels, buttons, alerts, list/table containers, loading/empty states).
- Treat domain classes (`media-capture__*`, `locations-*`, `app-*`) as semantic/layout layers on top of `ui-*`, not replacements for base primitives.
- Avoid introducing new page-prefixed base classes (for example `events-*` style primitives) when an equivalent `ui-*` primitive already exists.

---

*Convention analysis: 2026-04-15*
