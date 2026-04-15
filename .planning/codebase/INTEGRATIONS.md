# External Integrations

**Analysis Date:** 2026-04-15

## APIs & External Services

**Application code:**
- Not detected — `index.ts` contains no `fetch`, HTTP clients, or third-party SDK imports. No Stripe, Supabase, OpenAI, or similar usage in tracked source.

**Planned / conventional (not implemented in code):**
- `CLAUDE.md` documents intended Bun APIs (`Bun.serve`, `bun:sqlite`, `Bun.sql`, `Bun.redis`, `Bun.file`) as alternatives to common npm stacks; these are guidance only until implemented.

## Data Storage

**Databases:**
- Not detected — No `Bun.sql`, Prisma, or other DB client usage in source; no migration or schema directories.

**File Storage:**
- Local filesystem only if/when code uses `Bun.file` or standard FS APIs — not used in current `index.ts`.

**Caching:**
- Not detected — No Redis or other cache clients in `package.json` or source.

## Authentication & Identity

**Auth Provider:**
- Not detected — No auth libraries, JWT handling, or OAuth code in the repository.

## Monitoring & Observability

**Error Tracking:**
- Not detected — No Sentry or similar SDKs.

**Logs:**
- Standard output — Current entrypoint only uses `console.log` in `index.ts`.

## CI/CD & Deployment

**Hosting:**
- Not specified — No deployment manifests or platform-specific config in the repo.

**CI Pipeline:**
- Not detected — No `.github/workflows` or other CI configuration under the project root.

## Environment Configuration

**Required env vars:**
- None documented in committed files. When integrations are added, document required names in a template such as `.env.example` (not present as of this analysis).

**Secrets location:**
- If `.env` is used locally, it should remain gitignored; do not commit secrets. No committed secret files were analyzed.

## Webhooks & Callbacks

**Incoming:**
- Not detected — No `Bun.serve` routes or webhook handlers in `index.ts` or elsewhere.

**Outgoing:**
- Not detected — No outbound webhook or callback logic in source.

---

*Integration audit: 2026-04-15*
