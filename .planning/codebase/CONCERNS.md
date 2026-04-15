# Codebase Concerns

**Analysis Date:** 2026-04-15

## Tech Debt

**Stub entrypoint vs documented Bun app pattern:**
- Issue: `index.ts` only logs to the console and does not implement `Bun.serve()`, HTML route imports, or any of the architecture described in `CLAUDE.md`.
- Why: Typical `bun init` / README bootstrap state before feature work.
- Impact: Planning and execution docs that assume routes, APIs, or frontend bundles have no corresponding implementation to validate against; risk of duplicating bootstrap work or diverging from agreed stack.
- Fix approach: Replace or extend `index.ts` with `Bun.serve()` and an `index.html` entry (or equivalent) per `CLAUDE.md`, then grow features from that skeleton.

**Floating dev dependency version:**
- Issue: `package.json` pins `@types/bun` to `"latest"`, so CI and different machines can resolve different `bun-types` revisions over time.
- Why: Convenience during early setup.
- Impact: Spurious type errors or green CI on one machine and red on another after lockfile refresh; harder bisection when types change.
- Fix approach: Pin `@types/bun` to a specific semver range aligned with the team’s Bun version (e.g. match `bun-types` to installed Bun), and rely on `bun.lock` updates as intentional.

**TypeScript strictness gaps:**
- Issue: `tsconfig.json` enables `strict` but leaves `noUnusedLocals` and `noUnusedParameters` disabled (`false`).
- Why: Common default to reduce friction during rapid iteration.
- Impact: Dead code and unused parameters can accumulate unnoticed until refactors or copy-paste errors surface at runtime.
- Fix approach: Enable `noUnusedLocals` / `noUnusedParameters` (or use ESLint `@typescript-eslint/no-unused-vars`) once the codebase grows beyond a stub.

## Known Bugs

**Not applicable (application behavior):**
- The only executable application file is `index.ts`, which performs a single `console.log`. No user-facing flows, APIs, or stateful behavior exist to classify as product bugs. Re-evaluate this section after `Bun.serve()` and features land.

## Security Considerations

**No network or auth surface in application code:**
- Risk: None in the current `index.ts` (no sockets, no HTTP). Future additions (HTTP server, WebSockets, file uploads, subprocesses) introduce new classes of risk.
- Current mitigation: No attackable surface in shipped app logic.
- Recommendations: When adding `Bun.serve()` or routes, add explicit threat modeling: TLS termination, authn/z on protected routes, input validation, rate limiting for public endpoints, and safe defaults for CORS. Store secrets only in ignored `.env` files (see `.gitignore`) and never commit values.

**Environment files:**
- Risk: Accidental commit of secrets if `.env` patterns change or files are forced into git.
- Current mitigation: `.gitignore` excludes `.env`, `.env.local`, and environment-specific variants.
- Recommendations: Add a committed `.env.example` with placeholder names only when the first real env vars are introduced; document required variables in `README.md` without values.

## Performance Bottlenecks

**Not measurable in current codebase:**
- Problem: There are no HTTP handlers, database queries, or bundled assets to profile.
- Measurement: Not applicable.
- Cause: Application is a one-line script.
- Improvement path: After `Bun.serve()` and data paths exist, establish baselines (latency, bundle size, DB query counts) before optimizing.

## Fragile Areas

**Single-file application entry:**
- Why fragile: All future behavior will likely accrete in or around `index.ts` until structure is introduced; easy to create a monolith entry without tests.
- Common failures: Unclear separation of routing, domain logic, and infrastructure; difficult refactors once imports fan out.
- Safe modification: Introduce directories early (`src/` or feature folders), keep `index.ts` as a thin bootstrap that imports a `createServer()` or similar from a dedicated module.
- Test coverage: No tests cover `index.ts` (see Test Coverage Gaps).

**Documentation–implementation drift (`CLAUDE.md` vs `index.ts`):**
- Why fragile: Contributors may follow `CLAUDE.md` examples that do not exist in the repo, or extend `index.ts` in ways that conflict with stated conventions (e.g. adding Express despite “Don’t use express”).
- Common failures: Inconsistent patterns across new files; review friction.
- Safe modification: Treat `CLAUDE.md` as the target architecture; update `index.ts` and `README.md` together when the stack choice changes.
- Test coverage: Not applicable as documentation.

## Scaling Limits

**Not applicable yet:**
- Current capacity: N/A — no multi-user service or persistent store.
- Limit: N/A.
- Symptoms at limit: N/A.
- Scaling path: Define when HTTP and storage are added; then address connection pools, horizontal scaling, and stateless server design.

## Dependencies at Risk

**`@types/bun` resolution via `"latest"`:**
- Risk: Implicit upgrades to type definitions can break builds without a corresponding runtime Bun upgrade.
- Impact: CI failures or editor-only noise; rare runtime impact (types only).
- Migration plan: Pin version in `package.json`; document supported Bun version in `README.md`.

**TypeScript as peer dependency:**
- Risk: `peerDependencies` for `typescript` rely on the environment to provide TS; some tooling may not install peers unless explicitly added.
- Impact: Editor or `tsc` may be missing in minimal environments.
- Migration plan: Add `typescript` as a direct `devDependency` if the team wants guaranteed installs in all contexts.

## Missing Critical Features

**Entire product surface (HTTP app, domain logic, persistence):**
- Problem: No server, routes, UI, or data layer exists beyond the stub.
- Current workaround: None — project is pre-feature.
- Blocks: End-user value, integration testing, deployment narratives.
- Implementation complexity: High overall; first milestone is bounded by product scope (start with `Bun.serve()` + one route + tests).

**Automated quality gates:**
- Problem: No `bun test` files, no CI workflow files detected in the project root for running tests or typechecks on push.
- Current workaround: Manual runs (`bun run index.ts`, local `tsc` if used).
- Blocks: Regression safety as code grows.
- Implementation complexity: Low for a minimal GitHub Action or equivalent that runs `bun test` and optional `tsc --noEmit`.

## Test Coverage Gaps

**Application entrypoint (`index.ts`):**
- What's not tested: Any behavior (including that the process runs without throw — trivial today, important once logic exists).
- Risk: Future edits to `index.ts` have no safety net.
- Priority: Medium until non-trivial logic exists; High once `Bun.serve()` and routes are added.
- Difficulty to test: Low for current script; rises for HTTP handlers (need request/response assertions or integration tests).

**End-to-end and integration:**
- What's not tested: Nothing exists to exercise; no `*.test.ts` / `*.spec.ts` files in the repository.
- Risk: First real features ship without established patterns (fixtures, mocks, test layout per `CLAUDE.md` / `.planning/codebase/TESTING.md`).
- Priority: High before production traffic.
- Difficulty to test: Low for unit tests; medium for full E2E once a browser or HTTP client is involved.

---

*Concerns audit: 2026-04-15*
*Update as issues are fixed or new ones discovered*
