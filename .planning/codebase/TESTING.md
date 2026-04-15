# Testing Patterns

**Analysis Date:** 2026-04-15

## Test Framework

**Runner:**
- **Bun** built-in test runner (`bun:test`). The project does not use Jest or Vitest (`package.json` has no `jest`/`vitest` dependencies).

**Assertion library:**
- **`expect`** from `bun:test` (Jest-compatible API surface for common matchers).

**Config:**
- Not detected: no `bunfig.toml` test section and no separate test config file in the project root.

**Run commands:**
```bash
bun test                    # Run all tests discovered by Bun
bun test --watch            # Watch mode (if supported by installed Bun)
bun test path/to/file.test.ts   # Single file
bun test --coverage         # Coverage report (Bun coverage flag; verify with `bun test --help`)
```

**Documentation reference:**
- Example pattern is documented in `CLAUDE.md` (same repository).

## Test File Organization

**Location:**
- **No `*.test.ts` / `*.spec.ts` files** are present under the application project root as of this analysis. The only TypeScript application file is `index.ts`.

**Naming (prescriptive for new tests):**
- Co-locate tests as **`{module}.test.ts`** next to the module under test, or use a parallel `__tests__/` directory if a feature folder grows large—prefer co-location for small projects.

**Structure today:**
```
/Users/michaelweaver/Websites/home-assist/
├── index.ts              # Application entry (no test file yet)
├── package.json
├── tsconfig.json
└── README.md
```

## Test Structure

**Recommended suite shape (from `CLAUDE.md`, not yet present in repo):**
```typescript
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

**Patterns:**
- Use **`test("descriptive name", () => { ... })`** for single cases; use **`describe`** blocks when grouping multiple tests for the same unit (optional, supported by `bun:test`).
- Prefer **arrange / act / assert** structure inside each test for readability.

## Mocking

**Framework:**
- Use **Bun’s test APIs** (`mock`, spies) as documented for your Bun version—no separate Sinon or `vi` from Vitest in this project.

**Patterns:**
- Mock **network**, **filesystem**, and **environment** boundaries when testing HTTP handlers or integrations.
- Avoid mocking **pure helpers** and **internal business logic** unless necessary to isolate a failure.

**Example placeholder (verify API against current Bun docs when writing):**
```typescript
import { test, expect, mock } from "bun:test";

// Prefer mocking at module boundaries when testing modules that call fetch or Bun.serve clients
```

## Fixtures and Factories

**Test data:**
- No shared fixtures directory exists yet.

**Recommendation:**
- Add small **factory functions** inline in test files or under `test/fixtures/` / `tests/fixtures/` when the same payload is reused across tests.

## Coverage

**Requirements:**
- No coverage threshold or CI gate is defined in `package.json` or detected config files.

**View coverage:**
```bash
bun test --coverage
```

- Open generated coverage output if your Bun version writes HTML/lcov; path depends on Bun version (check `bun test --help`).

## Test Types

**Unit tests:**
- Primary expected style: fast tests for **pure functions** and **isolated modules** with dependencies mocked.

**Integration tests:**
- Not present yet. When adding `Bun.serve` or database code, add tests that hit real wiring with **test-only ports** or **in-memory** SQLite via `bun:sqlite` as appropriate.

**E2E tests:**
- Not detected (no Playwright/Cypress dependencies in `package.json`).

## Common Patterns

**Async testing:**
```typescript
import { test, expect } from "bun:test";

test("resolves data", async () => {
  const result = await Promise.resolve(42);
  expect(result).toBe(42);
});
```

**Error testing:**
```typescript
import { test, expect } from "bun:test";

test("throws on invalid input", () => {
  expect(() => {
    throw new Error("bad");
  }).toThrow("bad");
});
```

**GSD workflow note:**
- Project automation under `.cursor/get-shit-done/` references **RED** commits and test-oriented git messages for phased work; align test file creation with that workflow when using GSD execute/plan flows.

---

*Testing analysis: 2026-04-15*
