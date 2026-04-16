<!-- gsd-project-start source:PROJECT.md -->
## Project

**Home Assist Lab**

A **personal learning prototype** of a simplified “central location + webhook + alerts” model inspired by a commercial product: a Raspberry Pi–style location node (simulated on your Mac), a small **webhook orchestrator** that receives events from that node and fans them out to subscribers, and a **web client** so people scoped to a location can see activity and get alerts. It is intentionally **not** HomeKit, iOS/Android apps, or production Buildroot—just enough Bun + TypeScript + storage + React to understand the flow.

**Core Value:** You can **end-to-end trace one event** from “something happened on the node” → “orchestrator received and routed it” → “a subscribed user sees an alert”.

### Constraints

- **Tech stack**: Bun (not Node/npm for scripts), TypeScript, React for UI; storage via Bun’s SQLite module for the lab.
- **Scope**: Learning clarity over feature parity; prefer explicit, readable code paths over microservices.
<!-- gsd-project-end -->

<!-- gsd-stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript (ESNext) — Application code in `index.ts`; `tsconfig.json` enables JSX (`react-jsx`) for future UI even though no `.tsx` files exist yet.
- Markdown — `README.md`, workspace guidance in `CLAUDE.md`.
## Runtime
- [Bun](https://bun.com) — JavaScript/TypeScript runtime and package manager. `README.md` notes the project was created with Bun v1.3.8; `bun.lock` resolves `bun-types@1.3.12` (via `@types/bun`).
- Bun — Use `bun install`, `bun run`, `bun test` per `README.md` and `CLAUDE.md`.
- Lockfile: `bun.lock` present.
## Frameworks
- No application framework in use. `index.ts` is a minimal script (`console.log` only). Project conventions in `CLAUDE.md` prescribe `Bun.serve()` with HTML route imports (not Vite/Express) when a server is added.
- `bun:test` — Documented in `CLAUDE.md` as the test runner. No `*.test.ts` / `*.spec.ts` files detected in the repository root.
- Bun — Bundler and transpiler for TypeScript (implicit when running or building with Bun).
- TypeScript `^5` — Declared as `peerDependencies` in `package.json`; `bun.lock` resolves `typescript@5.9.3`.
## Key Dependencies
- `@types/bun` (dev) — Type definitions; pulls in `bun-types` for Bun APIs (`package.json`, `bun.lock`).
- `typescript` (^5, peer) — Type-checking and editor support; version pinned in lockfile (`bun.lock`).
- Not applicable — No HTTP server, database client, or other infrastructure libraries are listed in `package.json` yet.
## Configuration
- Bun loads `.env` automatically per `CLAUDE.md`; no `.env` or `.env.example` is committed in the repository (verify locally if present and gitignored).
- `tsconfig.json` — `moduleResolution: bundler`, `strict: true`, `jsx: react-jsx`, `noEmit: true` (typecheck/edit only; execution is via Bun).
- `package.json` — `"type": "module"`, entry implied as `index.ts` via `"module": "index.ts"` and `README.md` run command.
## Platform Requirements
- Bun installed (version compatible with lockfile’s `bun-types` / team Bun version).
- Any OS supported by Bun; no Docker or other dev containers are defined (no `Dockerfile` in repo).
- Not specified — No deployment config (e.g. no `.github/workflows`, no container or platform manifests in repo).
<!-- gsd-stack-end -->

<!-- gsd-conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- TypeScript source uses `.ts` at project root today (`index.ts`). For future modules, prefer **kebab-case** file names (e.g. `user-service.ts`, `api-routes.ts`) unless adding React components, which conventionally use **PascalCase** `.tsx` per `CLAUDE.md` examples.
- Entry module is referenced as `index.ts` in `package.json` (`"module": "index.ts"`).
- **camelCase** for functions and methods (no observed exceptions in application code).
- **camelCase** for locals and parameters.
- **UPPER_SNAKE_CASE** for module-level constants when introduced.
- **PascalCase** for interfaces, type aliases, and classes.
- Use `interface` vs `type` consistently with TypeScript defaults; no `I` prefix on interfaces.
## Code Style
- Not detected: no `.prettierrc`, `prettier` in `package.json`, `biome.json`, or `eslint.config.*` in the project root.
- Match **2-space indentation** and style of existing files when editing.
- Not detected: no ESLint or Biome configuration in the application tree.
- **TypeScript compiler** enforces correctness via `tsconfig.json` (see below).
- Use **`strict`: true** — no implicit `any`, strict null checks, etc.
- **`verbatimModuleSyntax`: true** — use `import type { X }` for type-only imports; use `type` keyword where required for isolated type imports.
- **`noUncheckedIndexedAccess`: true** — index signatures return `T | undefined`; narrow before use.
- **`noImplicitOverride`: true** — use `override` when overriding base members.
- **`moduleResolution`: "bundler"** with **`module`: "Preserve"`** — align imports with Bun’s bundler.
- **`allowImportingTsExtensions`: true** — imports may include `.ts` extensions where used.
## Import Organization
- Not configured in `tsconfig.json` — use relative paths unless `compilerOptions.paths` is added later.
## Error Handling
- `index.ts` does not demonstrate error handling.
- Prefer **`throw`** for unexpected states; catch at **HTTP route handlers**, **`Bun.serve` handlers**, or top-level `main` boundaries when those layers exist.
- For async handlers, use **`try` / `catch`** rather than floating promises.
- Return **`Response`** with appropriate status codes from route handlers rather than throwing through to the runtime when the failure is an expected HTTP error.
## Logging
- `index.ts` uses **`console.log`** for a one-line hello message.
- Prefer structured or leveled logging when the app grows; until a logger is introduced, **`console`** usage is acceptable for development. Avoid logging secrets or full request bodies containing credentials.
## Comments
- Explain non-obvious **why** (business rules, protocol quirks), not restate the code.
- Document public HTTP or library APIs with short comments or TSDoc when modules are shared.
- Not required for the current single-line entry file; use **`@param` / `@returns`** when exporting functions intended as reusable APIs.
## Function Design
## Module Design
- `index.ts` is a script-style entry (side effect only). Future modules should use **named exports** for libraries; **default export** is acceptable for React root components per common Bun + HTML import patterns in `CLAUDE.md`.
<!-- gsd-conventions-end -->

<!-- gsd-architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Single-file application entry (`index.ts`) with no internal modules, HTTP server, or data layer.
- GSD uses **markdown workflow specifications** (`.cursor/get-shit-done/workflows/*.md`) consumed by the IDE/agent layer, plus a **Node.js CLI** (`gsd-tools.cjs`) for state, roadmap, validation, and filesystem operations on planning docs.
- **Declarative agent and skill definitions** in `.cursor/agents/` and `.cursor/skills/` guide automation; behavior is documentation-driven rather than compiled into the Bun app.
## Layers
- Purpose: Execute the project’s TypeScript entry point.
- Location: `index.ts` (repository root).
- Contains: Standalone script logic only (`console.log` as of this analysis).
- Depends on: Bun runtime, `tsconfig.json` compiler options, `@types/bun` for editor/types.
- Used by: `bun run index.ts` (see `README.md`).
- Purpose: Encode stack choices and patterns for humans and AI assistants.
- Location: `CLAUDE.md`, `README.md`, `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc`.
- Contains: Bun-first rules (e.g. `Bun.serve()`, `bun:test`, no Vite/Express per `CLAUDE.md`).
- Depends on: Not applicable (documentation).
- Used by: Developers and Cursor when editing `*.ts`, `*.tsx`, `*.html`, `*.css`, `package.json`.
- Purpose: Define multi-step GSD commands (discuss, plan, execute, map-codebase, etc.) and centralize repetitive operations.
- Location: Workflows in `.cursor/get-shit-done/workflows/`; CLI at `.cursor/get-shit-done/bin/gsd-tools.cjs`; libraries in `.cursor/get-shit-done/bin/lib/*.cjs`; supporting references in `.cursor/get-shit-done/references/`; prompt contexts in `.cursor/get-shit-done/contexts/`.
- Contains: Orchestration steps (XML-tagged sections such as `<purpose>`, `<process>`), shared principles, and CommonJS modules for state, roadmap, phase, validation, intel, and related operations (see `gsd-tools.cjs` header comments).
- Depends on: Node.js for `gsd-tools.cjs`; filesystem layout under `.planning/` when workflows create or update artifacts; optional git for commit-related subcommands.
- Used by: Cursor agents and users following slash-command or workflow-driven flows.
- Purpose: Specialized system prompts for subagent types (planner, executor, codebase mapper, etc.).
- Location: `.cursor/agents/*.md` (e.g. `gsd-codebase-mapper.md`, `gsd-planner.md`).
- Contains: Role descriptions, constraints, and process instructions per agent type.
- Depends on: GSD workflows and skills for full behavior.
- Used by: Orchestrators that spawn named agent types matching workflow definitions.
- Purpose: Packaged instructions for common GSD operations (plan phase, ship, health check, etc.).
- Location: `.cursor/skills/<skill-name>/SKILL.md` (dozens of `gsd-*` skills).
- Contains: When to use the skill, steps, and references to workflows or templates.
- Depends on: `.cursor/get-shit-done/` templates and workflows where cross-linked.
- Used by: Agents and users invoking skills by name.
- Purpose: Starting points for generated markdown and config under `.planning/` and for codebase documentation.
- Location: `.cursor/get-shit-done/templates/` (including `codebase/` for STACK, ARCHITECTURE, STRUCTURE, etc., and `research-project/`).
- Contains: Template bodies and guidelines consumed by planning and mapping workflows.
- Depends on: Target paths under `.planning/` as defined by each workflow.
- Used by: GSD workflows and mappers when creating or refreshing artifacts.
- Purpose: Hold project planning outputs (roadmaps, phase dirs, codebase maps) separate from application source.
- Location: `.planning/` (currently only `.planning/codebase/*.md` is present; no `ROADMAP.md` or phase directories yet).
- Contains: Generated reference docs such as `STACK.md`, `CONVENTIONS.md`, `INTEGRATIONS.md`, `TESTING.md`, and this file’s companions.
- Depends on: Workflow/mapper runs; optional `gsd-tools.cjs` when full GSD state is initialized later.
- Used by: `/gsd-plan-phase`, `/gsd-execute-phase`, and humans browsing planning context.
## Data Flow
- **Application:** Stateless — no database or in-process session in `index.ts`.
- **GSD:** File-based when expanded — `gsd-tools.cjs` documents commands for `STATE.md`, roadmap, phase directories, todos, and validation; those files are not all present in a fresh repo but the tooling expects them once workflows create them.
## Key Abstractions
- Purpose: Single entry for GSD filesystem and planning operations (state, roadmap, phase, validate, commit, intel, etc.).
- Examples: `.cursor/get-shit-done/bin/gsd-tools.cjs`, with implementation split across `.cursor/get-shit-done/bin/lib/*.cjs` (`core.cjs`, `phase.cjs`, `roadmap.cjs`, `state.cjs`, and others).
- Pattern: Node CommonJS CLI invoked by workflows and scripts; reduces duplicated bash patterns across GSD commands.
- Purpose: Executable specification for a GSD command flow (purpose, process steps, agent types, expected artifacts).
- Examples: `.cursor/get-shit-done/workflows/map-codebase.md`, `.cursor/get-shit-done/workflows/execute-phase.md`, `.cursor/get-shit-done/workflows/plan-phase.md`.
- Pattern: Markdown with structured tags; references absolute or project-relative paths to `gsd-tools.cjs` and `.planning/`.
- Purpose: Constrain a subagent’s role, tools, and success criteria for one GSD concern.
- Examples: `.cursor/agents/gsd-codebase-mapper.md`, `.cursor/agents/gsd-planner.md`, `.cursor/agents/gsd-executor.md`.
- Pattern: Standalone markdown prompt consumed by the orchestrator when spawning typed agents.
- Purpose: Reusable, discoverable procedure for a named task (often maps 1:1 to a user-facing GSD capability).
- Examples: `.cursor/skills/gsd-map-codebase/SKILL.md`, `.cursor/skills/gsd-plan-phase/SKILL.md`.
- Pattern: Directory per skill with `SKILL.md` front matter and instructions.
- Purpose: Durable reference for planners and executors (stack, structure, conventions, concerns).
- Examples: `.planning/codebase/STACK.md`, `.planning/codebase/STRUCTURE.md` (this document’s companion), `.planning/codebase/CONVENTIONS.md`.
- Pattern: Human- and AI-oriented markdown generated or refreshed by mapper workflows.
## Entry Points
- Location: `index.ts`
- Triggers: `bun run index.ts` or `bun index.ts`
- Responsibilities: Entire current application behavior (minimal stub).
- Location: `.cursor/get-shit-done/bin/gsd-tools.cjs`
- Triggers: `node .../gsd-tools.cjs <command>` from workflows, scripts, or terminal
- Responsibilities: Planning state, roadmap/phase operations, validation, commits, intel, and related utilities per inline help in the file header.
- Location: `.cursor/get-shit-done/workflows/*.md`
- Triggers: Slash commands / orchestrator loading a named workflow
- Responsibilities: Step-by-step GSD procedures and agent spawn configuration.
## Error Handling
- **Application:** No custom `try/catch` in `index.ts` as of this analysis.
- **GSD:** Validate via `gsd-tools.cjs validate ...` subcommands where workflows require consistency checks before proceeding.
## Cross-Cutting Concerns
- **Application:** `console.log` / standard console APIs in `index.ts`.
- **GSD:** Workflow-driven; no unified app logger — reliance on agent/IDE output and optional `gsd-tools` feedback.
- **Application:** Not applicable at current scope.
- **GSD:** `gsd-tools.cjs` exposes `validate consistency`, `validate health`, and related checks for `.planning/` integrity when those workflows run.
- Not implemented in application code. GSD may reference external APIs (e.g. web search) via `gsd-tools.cjs` when configured; no auth flow in `index.ts`.
<!-- gsd-architecture-end -->

<!-- gsd-skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.cursor/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- gsd-skills-end -->

<!-- gsd-workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- gsd-workflow-end -->



<!-- gsd-profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- gsd-profile-end -->
