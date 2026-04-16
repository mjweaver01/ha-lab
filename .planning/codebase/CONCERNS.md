# Codebase Concerns

**Analysis Date:** 2026-04-15

## Tech Debt

**Media capture hook complexity (`useMediaCapture`):**
- Issue: A single hook owns device lifecycle, signal extraction, event emission, error UX, and learned-label capture, creating high coupling and difficult edits.
- Files: `src/client/hooks/use-media-capture.ts`, `src/client/media-capture-section.tsx`, `src/client/media-settings-page.tsx`
- Impact: Small changes to one behavior (for example, camera sampling) can regress unrelated behavior (for example, mic teardown or pipeline error states).
- Fix approach: Split into focused hooks/modules (`useMicCapture`, `useCameraCapture`, `useMediaSignalEmitter`) with contract-level tests per module.

**UI screen does filtering, pagination, and virtualization inline:**
- Issue: Event list state orchestration lives in one component with multiple synchronized effects and duplicated virtual-window calculations.
- Files: `src/client/events-screen.tsx`, `src/client/lib/events-view.ts`
- Impact: Pagination/scroll bugs are hard to reason about, and rendering logic is expensive to safely refactor.
- Fix approach: Extract a dedicated list-state hook and a presentational list component; move virtualization state machine into `src/client/lib/`.

**Bun runtime lock-in across core paths:**
- Issue: Server, DB, scripts, and test runner are Bun-specific (`Bun.serve`, `bun:sqlite`, Bun test APIs), reducing portability.
- Files: `src/server.ts`, `src/db/database.ts`, `src/db/migrate.ts`, `scripts/simulated-node.ts`, `package.json`
- Impact: Migration to another runtime or common CI environments requires broad rewrites rather than targeted adapters.
- Fix approach: Introduce thin adapters for HTTP server and DB interfaces, then isolate Bun-specific implementations behind those boundaries.

## Known Bugs

**Unreadable event rows can crash GET events path:**
- Symptoms: A malformed JSON `body` value in `events.body` can throw during response shaping.
- Files: `src/routes/events.ts`
- Trigger: `JSON.parse(r.body)` in `handleGetEvents` receives non-JSON text from existing rows.
- Workaround: Sanitize malformed DB rows manually; long term, parse in a guarded try/catch per row and emit `null` or raw text fallback.

**Media settings persistence accepts out-of-range values:**
- Symptoms: Invalid persisted numeric settings can degrade capture behavior (extreme thresholds/cadence values).
- Files: `src/client/lib/media-settings.ts`, `src/client/media-settings-page.tsx`
- Trigger: `loadMediaDetectionSettings()` only checks type `number`, not allowed ranges.
- Workaround: Clear local storage key and restart UI; add clamping/validation in load path.

## Security Considerations

**No authentication/authorization on ingestion and subscriptions:**
- Risk: Any network-reachable caller can post events or register callbacks for any `location_id`.
- Files: `src/server.ts`, `src/routes/events.ts`, `src/routes/subscribers.ts`
- Current mitigation: Input-shape validation only.
- Recommendations: Require API key or signed token on all write/read endpoints and enforce location-level authorization checks.

**SSRF risk in callback fan-out:**
- Risk: Subscriber callback URLs are accepted with broad URL validation and then fetched by server-side code.
- Files: `src/routes/subscribers.ts`, `src/webhooks/fan-out.ts`
- Current mitigation: URL parse validation only (`new URL(...)`).
- Recommendations: Restrict allowed protocols/hosts, block private/reserved IP ranges, and add outbound allowlists.

**Permissive CORS on events endpoint:**
- Risk: Wildcard CORS headers on `/events` enable cross-origin browser access without auth boundaries.
- Files: `src/server.ts`
- Current mitigation: Comment indicates "dev-only" intent.
- Recommendations: Gate CORS by environment, allowed origins, and authenticated requests.

## Performance Bottlenecks

**Unbounded event list queries and payload size:**
- Problem: `GET /events` fetches all rows for a location with descending sort and no limit/pagination.
- Files: `src/routes/events.ts`
- Cause: Query omits `LIMIT/OFFSET` and does full response materialization.
- Improvement path: Add cursor/offset pagination with indexed sort keys and return bounded page sizes.

**Synchronous webhook delivery in request path:**
- Problem: Event ingestion waits for all subscriber fan-out attempts before completing response.
- Files: `src/routes/events.ts`, `src/webhooks/fan-out.ts`
- Cause: `await deliverEventToSubscribers(...)` in `handlePostEvent`.
- Improvement path: Queue deliveries asynchronously (job table/worker), return early after event insert, and process retries out-of-band.

**Continuous frame/audio processing loop cost:**
- Problem: Media capture loops run via `requestAnimationFrame` with per-frame analysis and candidate scoring.
- Files: `src/client/hooks/use-media-capture.ts`, `src/client/lib/media-learning.ts`
- Cause: Frequent signal computation plus canvas extraction/classification work.
- Improvement path: Shift heavy steps to lower-frequency intervals or worker paths and add CPU profiling budgets.

## Fragile Areas

**Polling new-event marker assumes monotonic ID semantics:**
- Files: `src/client/lib/new-events.ts`, `src/client/hooks/use-events-poll.ts`
- Why fragile: Newness is inferred by `id > previousMax`; any non-monotonic merge/import behavior breaks highlighting.
- Safe modification: Move to timestamp-plus-id comparator with server-provided cursor semantics.
- Test coverage: Basic helper tests exist in `src/client/lib/new-events.test.ts`; cross-session and backfill edge cases are not covered.

**Migration runner assumes serialized execution:**
- Files: `src/db/migrate.ts`, `src/db/migrations/001_initial.sql`, `src/db/migrations/002_events_subscribers.sql`
- Why fragile: No inter-process migration lock; concurrent startup/migration can race.
- Safe modification: Add lock table or file lock, and retry on SQLITE_BUSY during migration transaction.
- Test coverage: `src/db/migrate.test.ts` validates happy path but not concurrent runners.

## Scaling Limits

**Event retention and delivery logs grow unbounded:**
- Current capacity: Bounded only by SQLite file growth.
- Limit: Query latency and storage pressure increase as `events` and `event_deliveries` grow.
- Scaling path: Introduce retention policies, archival jobs, and indexed pagination patterns.
- Files: `src/db/migrations/002_events_subscribers.sql`, `src/routes/events.ts`, `src/webhooks/fan-out.ts`

## Dependencies at Risk

**Floating type dependency can introduce non-deterministic breakage:**
- Risk: `@types/bun` is pinned to `latest`, which can change behavior/type checks unexpectedly.
- Impact: CI/editor type behavior may drift without source changes.
- Migration plan: Pin explicit `@types/bun` version and upgrade intentionally.
- Files: `package.json`

## Missing Critical Features

**Missing delivery controls (timeouts/retries/dead-letter):**
- Problem: Fan-out lacks explicit timeout, retry backoff, and dead-letter handling for persistent subscriber failures.
- Blocks: Reliable webhook delivery under partial outages and predictable latency under slow subscribers.
- Files: `src/webhooks/fan-out.ts`, `src/routes/events.ts`

**Missing endpoint-level abuse protection:**
- Problem: No visible request-size limits, rate limiting, or per-location quotas on write endpoints.
- Blocks: Safe operation under noisy or malicious clients.
- Files: `src/server.ts`, `src/routes/events.ts`, `src/routes/subscribers.ts`

## Test Coverage Gaps

**Route-level negative and hardening paths are under-tested:**
- What's not tested: Rejection of unsafe callback targets, malformed stored event JSON recovery, and large payload behavior.
- Files: `src/routes/events.ts`, `src/routes/subscribers.ts`, `src/webhooks/fan-out.ts`
- Risk: Security and reliability regressions can ship unnoticed.
- Priority: High

**UI behavior under long event lists is not stress-tested:**
- What's not tested: Virtualized rendering behavior with large datasets and rapid polling updates.
- Files: `src/client/events-screen.tsx`, `src/client/events-screen.test.tsx`
- Risk: UI jank, incorrect row windows, and pagination inconsistencies under production-like volumes.
- Priority: Medium

---

*Concerns audit: 2026-04-15*
