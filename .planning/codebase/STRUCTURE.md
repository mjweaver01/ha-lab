# Codebase Structure

**Analysis Date:** 2026-04-15

## Directory Layout

```
home-assist/
├── index.ts              # Bun application entry (minimal script)
├── package.json          # Bun package manifest; `"module": "index.ts"`
├── bun.lock              # Bun lockfile
├── tsconfig.json         # TypeScript / JSX settings for Bun
├── README.md             # Install and run instructions
├── CLAUDE.md             # Bun-first stack and patterns for AI assistants
├── node_modules/         # Dependencies (gitignored)
├── .gitignore            # Ignores node_modules, .env, build outputs, etc.
├── .planning/            # GSD planning artifacts
│   └── codebase/         # Codebase map outputs (STACK, ARCHITECTURE, …)
├── .cursor/              # Cursor: GSD install, agents, skills, rules
│   ├── agents/           # GSD subagent prompt definitions (gsd-*.md)
│   ├── skills/           # Per-skill directories (gsd-*/SKILL.md)
│   ├── rules/            # Cursor rules (e.g. Bun vs Node)
│   ├── get-shit-done/    # GSD workflows, bin, templates, references
│   │   ├── bin/          # gsd-tools.cjs + lib/*.cjs
│   │   ├── workflows/    # Orchestration markdown per GSD command
│   │   ├── templates/    # Doc templates (codebase/, research-project/, …)
│   │   ├── references/   # Shared GSD reference docs
│   │   └── contexts/     # Prompt context snippets (dev, research, review)
│   └── gsd-file-manifest.json
```

## Directory Purposes

**Repository root:**
- Purpose: Bun/TypeScript project root and single application file.
- Contains: `index.ts`, manifests, lockfile, top-level docs.
- Key files: `index.ts`, `package.json`, `tsconfig.json`, `CLAUDE.md`, `README.md`, `bun.lock`
- Subdirectories: `.planning/`, `.cursor/`, `node_modules/` (generated)

**`.planning/`:**
- Purpose: Store GSD-generated and hand-maintained planning documents.
- Contains: Currently `codebase/` only; future phases may add `ROADMAP.md`, `STATE.md`, phase directories, etc.
- Key files: `.planning/codebase/STACK.md`, `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/INTEGRATIONS.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`
- Subdirectories: `codebase/` — reference docs for planners/executors

**`.cursor/agents/`:**
- Purpose: One markdown file per GSD agent type (mapper, planner, executor, verifier, …).
- Contains: `gsd-*.md` prompt specifications.
- Key files: Examples include `gsd-codebase-mapper.md`, `gsd-planner.md`, `gsd-executor.md`
- Subdirectories: None (flat)

**`.cursor/skills/`:**
- Purpose: Executable skill playbooks for GSD commands and utilities.
- Contains: Directories named `gsd-<feature>/` each with `SKILL.md`.
- Key files: `gsd-map-codebase/SKILL.md`, `gsd-plan-phase/SKILL.md`, `gsd-execute-phase/SKILL.md` (among many others)
- Subdirectories: One directory per skill

**`.cursor/rules/`:**
- Purpose: Cursor rule files (e.g. when to apply Bun conventions).
- Contains: `.mdc` rules such as `use-bun-instead-of-node-vite-npm-pnpm.mdc`
- Key files: Match `CLAUDE.md` stack guidance for applicable globs

**`.cursor/get-shit-done/`:**
- Purpose: Core GSD package: workflows, CLI, templates, references.
- Contains: Large `workflows/` tree; `bin/` for Node CLI; `templates/` for generated doc shapes; `references/` for methodology; `contexts/` for reusable prompt blocks.
- Key files: `bin/gsd-tools.cjs`, `workflows/map-codebase.md`, `templates/codebase/architecture.md`, `templates/codebase/structure.md`
- Subdirectories: `bin/`, `bin/lib/`, `workflows/`, `templates/`, `templates/codebase/`, `references/`, `contexts/`

## Key File Locations

**Entry Points:**
- `index.ts` — Bun application entry (`bun run index.ts`).
- `.cursor/get-shit-done/bin/gsd-tools.cjs` — GSD CLI entry for planning and validation commands.

**Configuration:**
- `package.json` — Package name `home-assist`, `type: module`, devDependency `@types/bun`, peer `typescript`.
- `tsconfig.json` — Strict TypeScript, bundler resolution, `jsx: react-jsx`, `noEmit: true`.
- `bun.lock` — Locked dependency versions for Bun installs.
- `.gitignore` — Excludes `node_modules/`, `.env*`, `dist`, `out`, coverage, caches.
- `CLAUDE.md` — Workspace rule file for Bun stack (not a runtime config file).

**Core Logic:**
- `index.ts` — Only application logic file at repository root (minimal).
- `.cursor/get-shit-done/bin/lib/*.cjs` — GSD implementation modules (phase, roadmap, state, audit, etc.).

**Planning / documentation outputs:**
- `.planning/codebase/*.md` — Codebase reference set produced or maintained by mapping workflows.

**Testing:**
- No `*.test.ts` or `*.spec.ts` at repository root as of this analysis; `CLAUDE.md` documents `bun:test` patterns for future tests.

**User-facing docs:**
- `README.md` — Install (`bun install`) and run (`bun run index.ts`).

## Naming Conventions

**Files:**
- `index.ts` — Lowercase entry script at root (Bun default init style).
- `gsd-*.md` — GSD agent definitions under `.cursor/agents/`.
- `SKILL.md` — Fixed name inside each `.cursor/skills/<name>/` directory.
- `*.mdc` — Cursor rules under `.cursor/rules/`.
- `*.cjs` — CommonJS modules for Node (`gsd-tools.cjs`, `bin/lib/*.cjs`).
- UPPERCASE.md — Prominent project or generated maps: `CLAUDE.md`, `README.md`, `.planning/codebase/STACK.md`, etc.

**Directories:**
- `gsd-*` — Skill and agent-related folders use kebab-case with `gsd-` prefix under `.cursor/skills/`.
- `get-shit-done/` — GSD product directory name (fixed).
- `codebase/` — Lowercase subdirectory for codebase map templates and outputs.

**Special Patterns:**
- Workflow files: kebab-case matching command names (e.g. `map-codebase.md`, `plan-phase.md`) under `.cursor/get-shit-done/workflows/`.
- Template mirrors: `.cursor/get-shit-done/templates/codebase/` defines shapes for `.planning/codebase/` outputs.

## Where to Add New Code

**New application features (HTTP API, UI, domain logic):**
- Primary code: Prefer new modules under a dedicated directory (e.g. `src/`) or sibling files next to `index.ts`; `index.ts` should remain thin and delegate to modules as the app grows. `CLAUDE.md` prescribes `Bun.serve()` with HTML imports for full-stack patterns.
- Configuration: Add env vars in local `.env` (gitignored per `.gitignore`); do not commit secrets.
- Tests: Co-located `*.test.ts` or a `test/` tree; run with `bun test` per `CLAUDE.md`.

**New GSD workflow or command behavior:**
- Workflow steps: `.cursor/get-shit-done/workflows/<command>.md`
- Shared CLI logic: extend or add modules under `.cursor/get-shit-done/bin/lib/` and wire through `gsd-tools.cjs` if new subcommands are needed.
- Agent behavior: new or updated `.cursor/agents/gsd-<role>.md`
- User-facing skill: new `.cursor/skills/gsd-<name>/SKILL.md`

**New planning artifacts:**
- Generated maps and references: `.planning/codebase/` or phase-specific dirs under `.planning/` once roadmap workflows create them.
- Templates for new artifact types: `.cursor/get-shit-done/templates/`

**Utilities:**
- Application shared helpers: a future `src/lib/` or `lib/` at repo root (convention not fixed yet — only `index.ts` exists).
- GSD shared helpers: `.cursor/get-shit-done/bin/lib/*.cjs` for Node-side reuse.

## Special Directories

**`node_modules/`:**
- Purpose: Bun-installed packages.
- Generated: Yes (`bun install`).
- Committed: No (listed in `.gitignore`).

**`.planning/codebase/`:**
- Purpose: Long-lived codebase reference for GSD plan/execute phases.
- Generated: Partially — refreshed by `/gsd-map-codebase` and related mappers; may be hand-edited for small fixes.
- Committed: Yes (typical for team visibility; confirm team policy).

**`.cursor/get-shit-done/bin/lib/`:**
- Purpose: Implementation detail of `gsd-tools.cjs`; not imported by the Bun app.
- Generated: No — maintained as part of GSD.
- Committed: Yes.

---

*Structure analysis: 2026-04-15*
*Update when directory structure changes*
