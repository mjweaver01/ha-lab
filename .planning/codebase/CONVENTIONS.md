# Coding Conventions

**Analysis Date:** 2026-04-15

## Naming Patterns

**Files:**
- TypeScript source uses `.ts` at project root today (`index.ts`). For future modules, prefer **kebab-case** file names (e.g. `user-service.ts`, `api-routes.ts`) unless adding React components, which conventionally use **PascalCase** `.tsx` per `CLAUDE.md` examples.
- Entry module is referenced as `index.ts` in `package.json` (`"module": "index.ts"`).

**Functions:**
- **camelCase** for functions and methods (no observed exceptions in application code).

**Variables:**
- **camelCase** for locals and parameters.
- **UPPER_SNAKE_CASE** for module-level constants when introduced.

**Types:**
- **PascalCase** for interfaces, type aliases, and classes.
- Use `interface` vs `type` consistently with TypeScript defaults; no `I` prefix on interfaces.

## Code Style

**Formatting:**
- Not detected: no `.prettierrc`, `prettier` in `package.json`, `biome.json`, or `eslint.config.*` in the project root.
- Match **2-space indentation** and style of existing files when editing.

**Linting:**
- Not detected: no ESLint or Biome configuration in the application tree.
- **TypeScript compiler** enforces correctness via `tsconfig.json` (see below).

**TypeScript compiler (`tsconfig.json`):**
- Use **`strict`: true** — no implicit `any`, strict null checks, etc.
- **`verbatimModuleSyntax`: true** — use `import type { X }` for type-only imports; use `type` keyword where required for isolated type imports.
- **`noUncheckedIndexedAccess`: true** — index signatures return `T | undefined`; narrow before use.
- **`noImplicitOverride`: true** — use `override` when overriding base members.
- **`moduleResolution`: "bundler"** with **`module`: "Preserve"`** — align imports with Bun’s bundler.
- **`allowImportingTsExtensions`: true** — imports may include `.ts` extensions where used.

## Import Organization

**Order (recommended when the codebase grows):**
1. External packages (including `bun:*` modules such as `bun:sqlite` when used).
2. Type-only imports (`import type`) may be grouped with their runtime counterparts or separated; stay consistent within a file.
3. Relative imports (`./foo`, `../bar`).

**Path aliases:**
- Not configured in `tsconfig.json` — use relative paths unless `compilerOptions.paths` is added later.

## Error Handling

**Current application code:**
- `index.ts` does not demonstrate error handling.

**Patterns to adopt (aligned with project rules in `CLAUDE.md`):**
- Prefer **`throw`** for unexpected states; catch at **HTTP route handlers**, **`Bun.serve` handlers**, or top-level `main` boundaries when those layers exist.
- For async handlers, use **`try` / `catch`** rather than floating promises.
- Return **`Response`** with appropriate status codes from route handlers rather than throwing through to the runtime when the failure is an expected HTTP error.

## Logging

**Current state:**
- `index.ts` uses **`console.log`** for a one-line hello message.

**Project guidance (`CLAUDE.md`):**
- Prefer structured or leveled logging when the app grows; until a logger is introduced, **`console`** usage is acceptable for development. Avoid logging secrets or full request bodies containing credentials.

## Comments

**When to comment:**
- Explain non-obvious **why** (business rules, protocol quirks), not restate the code.
- Document public HTTP or library APIs with short comments or TSDoc when modules are shared.

**JSDoc/TSDoc:**
- Not required for the current single-line entry file; use **`@param` / `@returns`** when exporting functions intended as reusable APIs.

## Function Design

**Size:** Keep handlers small; extract helpers into named functions in the same file or under a `lib/` or `src/` tree when the project grows.

**Parameters:** Prefer explicit object parameters for three or more related arguments.

**Return values:** Prefer explicit return types on exported functions for public APIs.

## Module Design

**Exports:**
- `index.ts` is a script-style entry (side effect only). Future modules should use **named exports** for libraries; **default export** is acceptable for React root components per common Bun + HTML import patterns in `CLAUDE.md`.

**Barrel files:** Not used yet; add `index.ts` barrel re-exports only when a directory has a clear public API.

---

*Convention analysis: 2026-04-15*
