# Technology Stack

**Analysis Date:** 2026-04-15

## Languages

**Primary:**
- TypeScript (ESNext) — Application code in `index.ts`; `tsconfig.json` enables JSX (`react-jsx`) for future UI even though no `.tsx` files exist yet.

**Secondary:**
- Markdown — `README.md`, workspace guidance in `CLAUDE.md`.

## Runtime

**Environment:**
- [Bun](https://bun.com) — JavaScript/TypeScript runtime and package manager. `README.md` notes the project was created with Bun v1.3.8; `bun.lock` resolves `bun-types@1.3.12` (via `@types/bun`).

**Package Manager:**
- Bun — Use `bun install`, `bun run`, `bun test` per `README.md` and `CLAUDE.md`.
- Lockfile: `bun.lock` present.

## Frameworks

**Core:**
- No application framework in use. `index.ts` is a minimal script (`console.log` only). Project conventions in `CLAUDE.md` prescribe `Bun.serve()` with HTML route imports (not Vite/Express) when a server is added.

**Testing:**
- `bun:test` — Documented in `CLAUDE.md` as the test runner. No `*.test.ts` / `*.spec.ts` files detected in the repository root.

**Build/Dev:**
- Bun — Bundler and transpiler for TypeScript (implicit when running or building with Bun).
- TypeScript `^5` — Declared as `peerDependencies` in `package.json`; `bun.lock` resolves `typescript@5.9.3`.

## Key Dependencies

**Critical:**
- `@types/bun` (dev) — Type definitions; pulls in `bun-types` for Bun APIs (`package.json`, `bun.lock`).
- `typescript` (^5, peer) — Type-checking and editor support; version pinned in lockfile (`bun.lock`).

**Infrastructure:**
- Not applicable — No HTTP server, database client, or other infrastructure libraries are listed in `package.json` yet.

## Configuration

**Environment:**
- Bun loads `.env` automatically per `CLAUDE.md`; no `.env` or `.env.example` is committed in the repository (verify locally if present and gitignored).

**Build:**
- `tsconfig.json` — `moduleResolution: bundler`, `strict: true`, `jsx: react-jsx`, `noEmit: true` (typecheck/edit only; execution is via Bun).
- `package.json` — `"type": "module"`, entry implied as `index.ts` via `"module": "index.ts"` and `README.md` run command.

## Platform Requirements

**Development:**
- Bun installed (version compatible with lockfile’s `bun-types` / team Bun version).
- Any OS supported by Bun; no Docker or other dev containers are defined (no `Dockerfile` in repo).

**Production:**
- Not specified — No deployment config (e.g. no `.github/workflows`, no container or platform manifests in repo).

---

*Stack analysis: 2026-04-15*
