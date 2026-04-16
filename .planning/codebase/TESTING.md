# Testing Patterns

**Analysis Date:** 2026-04-15

## Test Framework

**Runner:**
- Bun test runner via `bun:test` imports.
- Config: No dedicated `vitest.config.*` or `jest.config.*` detected; test behavior is driven by defaults plus runtime setup in individual tests (for example `src/client/hooks/use-media-capture.test.ts`).

**Assertion Library:**
- Built-in Bun assertions/mocks (`describe`, `test`, `expect`, `mock`) from `bun:test`.
- React rendering/assertions via `@testing-library/react` in `src/client/events-screen.test.tsx` and `src/client/media-capture-section.test.tsx`.

**Run Commands:**
```bash
bun test                     # Run all tests
bun test --watch             # Watch mode
bun test --coverage          # Coverage report (manual; not scripted in package.json)
```

## Test File Organization

**Location:**
- Tests are co-located with implementation files under `src/` and `scripts/` (examples: `src/webhooks/fan-out.test.ts`, `scripts/simulated-node.test.ts`).

**Naming:**
- Use `<module>.test.ts` and `<component>.test.tsx` naming directly beside source (`src/client/lib/new-events.ts` + `src/client/lib/new-events.test.ts`).

**Structure:**
```
src/
  client/
    api/*.test.ts
    hooks/*.test.ts
    lib/*.test.ts
    *.test.tsx
  db/*.test.ts
  webhooks/*.test.ts
  orchestrator.integration.test.ts
scripts/*.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe("fetchEvents", () => {
  test("GET /events?location_id= with encoded id", async () => {
    // arrange
    // act
    // assert
  });
});
```

**Patterns:**
- Prefer behavior-driven test names that include scenario and expected outcome (`src/client/lib/media-throttle.test.ts`, `src/client/lib/media-signals-video.test.ts`).
- Keep one focused behavior per test and assert concrete side effects (status codes, payloads, DB row counts) in `src/orchestrator.integration.test.ts`.
- Use `beforeAll`/`beforeEach`/`afterEach` for deterministic runtime setup/teardown (`src/client/hooks/use-media-capture.test.ts`, `src/webhooks/fan-out.test.ts`).

## Mocking

**Framework:** Bun `mock()` with direct `globalThis` overrides and dependency injection.

**Patterns:**
```typescript
const fetchImpl: typeof fetch = async () => new Response("bad event", { status: 400 });
await expect(postEvent("http://127.0.0.1:3000", payload, fetchImpl)).rejects.toThrow();
```

```typescript
globalThis.fetch = mock(() => Promise.resolve(new Response(null, { status: 202 }))) as typeof fetch;
Object.defineProperty(globalThis.navigator, "mediaDevices", {
  value: { getUserMedia: mock(() => Promise.resolve(stream)) },
  configurable: true,
});
```

**What to Mock:**
- Network I/O (`fetch`) in client and fan-out tests (`src/client/api/events-client.post.test.ts`, `src/webhooks/fan-out.test.ts`).
- Browser APIs (`navigator.mediaDevices`, `AudioContext`, RAF) for hook/component tests in `src/client/hooks/use-media-capture.test.ts`.
- Time progression (`Date.now`) where cadence or throttling is under test (`src/client/hooks/use-media-capture.test.ts`, `src/client/lib/media-signals-audio.test.ts`).

**What NOT to Mock:**
- SQL behavior for persistence constraints; use real temporary SQLite files (`src/db/migrate.test.ts`).
- Route/server wiring when validating full orchestrator behavior (`src/orchestrator.integration.test.ts`).

## Fixtures and Factories

**Test Data:**
```typescript
function makeEvent(id: number, createdAt: string): EventListItem {
  return { id, location_id: 7, event_type: "test.event", created_at: createdAt, body: null };
}
```

**Location:**
- Fixture helpers are inline in each test file (`makeEvent` in `src/client/lib/events-view.test.ts`, `makeTrack`/`makeStream` in `src/client/hooks/use-media-capture.test.ts`), not centralized.

## Coverage

**Requirements:** No enforced coverage threshold detected in repo config.

**View Coverage:**
```bash
bun test --coverage
```

## Test Types

**Unit Tests:**
- Pure utility behavior and guards (`src/client/lib/events-view.test.ts`, `src/client/lib/media-throttle.test.ts`, `src/client/lib/new-events.test.ts`, `src/client/lib/media-errors.test.ts`).

**Integration Tests:**
- Server/database/webhook integrations with temporary SQLite and real route handlers (`src/orchestrator.integration.test.ts`, `src/db/migrate.test.ts`, `src/webhooks/fan-out.test.ts`).

**E2E Tests:**
- No browser automation framework (Playwright/Cypress) detected.
- `.tsx` tests are component integration tests in `happy-dom`, not full end-to-end across a real browser/runtime.

## Common Patterns

**Async Testing:**
```typescript
await act(async () => {
  await result.current.startMic();
});
await waitFor(() => {
  expect(result.current.micError).not.toBeNull();
});
```

**Error Testing:**
```typescript
await expect(fetchEvents("http://x", Number.NaN, mock())).rejects.toThrow();
expect(() =>
  db.run(
    "INSERT INTO location_members (location_id, user_id) VALUES ($locationId, $userId)",
    { $locationId: 99_999, $userId: userId },
  ),
).toThrow();
```

## Coverage Gaps To Prioritize

- Add route-level negative-path tests for malformed `GET /events` payload bodies and parse failures in `src/routes/events.ts`.
- Add tests for environment parsing defaults and invalid values in `src/client/lib/public-env.ts`.
- Add lifecycle cleanup assertions for camera teardown edge-cases in `src/client/hooks/use-media-capture.ts` (for example repeated start/stop cycles).
- Add resilience tests around non-JSON `body` payload handling and callback HTTP failures in `src/webhooks/fan-out.ts`.
- Add smoke coverage for `scripts/simulated-node.ts` CLI arg parsing and exit codes beyond happy path.

---

*Testing analysis: 2026-04-15*
