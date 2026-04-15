# Architecture

**Analysis Date:** 2026-04-15

## Pattern Overview

**Overall:** Hybrid repository — minimal Bun TypeScript application scaffold at the repository root, plus an embedded **GSD (Get Shit Done)** planning system under `.cursor/get-shit-done/` that orchestrates AI workflows, and **Cursor-native** assets (agent prompts, skills, rules). Application code is not yet layered; planning artifacts live under `.planning/`.

**Key Characteristics:**
- Single-file application entry (`index.ts`) with no internal modules, HTTP server, or data layer.
- GSD uses **markdown workflow specifications** (`.cursor/get-shit-done/workflows/*.md`) consumed by the IDE/agent layer, plus a **Node.js CLI** (`gsd-tools.cjs`) for state, roadmap, validation, and filesystem operations on planning docs.
- **Declarative agent and skill definitions** in `.cursor/agents/` and `.cursor/skills/` guide automation; behavior is documentation-driven rather than compiled into the Bun app.

## Layers

**Application runtime (Bun):**
- Purpose: Execute the project’s TypeScript entry point.
- Location: `index.ts` (repository root).
- Contains: Standalone script logic only (`console.log` as of this analysis).
- Depends on: Bun runtime, `tsconfig.json` compiler options, `@types/bun` for editor/types.
- Used by: `bun run index.ts` (see `README.md`).

**Project conventions and editor guidance:**
- Purpose: Encode stack choices and patterns for humans and AI assistants.
- Location: `CLAUDE.md`, `README.md`, `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc`.
- Contains: Bun-first rules (e.g. `Bun.serve()`, `bun:test`, no Vite/Express per `CLAUDE.md`).
- Depends on: Not applicable (documentation).
- Used by: Developers and Cursor when editing `*.ts`, `*.tsx`, `*.html`, `*.css`, `package.json`.

**GSD workflow orchestration (markdown + Node tooling):**
- Purpose: Define multi-step GSD commands (discuss, plan, execute, map-codebase, etc.) and centralize repetitive operations.
- Location: Workflows in `.cursor/get-shit-done/workflows/`; CLI at `.cursor/get-shit-done/bin/gsd-tools.cjs`; libraries in `.cursor/get-shit-done/bin/lib/*.cjs`; supporting references in `.cursor/get-shit-done/references/`; prompt contexts in `.cursor/get-shit-done/contexts/`.
- Contains: Orchestration steps (XML-tagged sections such as `<purpose>`, `<process>`), shared principles, and CommonJS modules for state, roadmap, phase, validation, intel, and related operations (see `gsd-tools.cjs` header comments).
- Depends on: Node.js for `gsd-tools.cjs`; filesystem layout under `.planning/` when workflows create or update artifacts; optional git for commit-related subcommands.
- Used by: Cursor agents and users following slash-command or workflow-driven flows.

**Cursor agent specifications:**
- Purpose: Specialized system prompts for subagent types (planner, executor, codebase mapper, etc.).
- Location: `.cursor/agents/*.md` (e.g. `gsd-codebase-mapper.md`, `gsd-planner.md`).
- Contains: Role descriptions, constraints, and process instructions per agent type.
- Depends on: GSD workflows and skills for full behavior.
- Used by: Orchestrators that spawn named agent types matching workflow definitions.

**Skills (reusable task playbooks):**
- Purpose: Packaged instructions for common GSD operations (plan phase, ship, health check, etc.).
- Location: `.cursor/skills/<skill-name>/SKILL.md` (dozens of `gsd-*` skills).
- Contains: When to use the skill, steps, and references to workflows or templates.
- Depends on: `.cursor/get-shit-done/` templates and workflows where cross-linked.
- Used by: Agents and users invoking skills by name.

**Templates:**
- Purpose: Starting points for generated markdown and config under `.planning/` and for codebase documentation.
- Location: `.cursor/get-shit-done/templates/` (including `codebase/` for STACK, ARCHITECTURE, STRUCTURE, etc., and `research-project/`).
- Contains: Template bodies and guidelines consumed by planning and mapping workflows.
- Depends on: Target paths under `.planning/` as defined by each workflow.
- Used by: GSD workflows and mappers when creating or refreshing artifacts.

**Planning artifact store:**
- Purpose: Hold project planning outputs (roadmaps, phase dirs, codebase maps) separate from application source.
- Location: `.planning/` (currently only `.planning/codebase/*.md` is present; no `ROADMAP.md` or phase directories yet).
- Contains: Generated reference docs such as `STACK.md`, `CONVENTIONS.md`, `INTEGRATIONS.md`, `TESTING.md`, and this file’s companions.
- Depends on: Workflow/mapper runs; optional `gsd-tools.cjs` when full GSD state is initialized later.
- Used by: `/gsd-plan-phase`, `/gsd-execute-phase`, and humans browsing planning context.

## Data Flow

**Bun application execution:**

1. Developer runs `bun run index.ts` (see `README.md`).
2. Bun loads `index.ts` as ESM (`package.json` `"type": "module"`).
3. Script runs top-level statements (currently logging to the console).
4. Process exits; no persistent server or shared in-memory state.

**GSD workflow execution (conceptual, e.g. codebase mapping or phase execution):**

1. A workflow document in `.cursor/get-shit-done/workflows/<name>.md` defines steps (init, spawn agents, file operations).
2. Init steps often invoke `node .cursor/get-shit-done/bin/gsd-tools.cjs <subcommand> ...` to load config, resolve paths, or validate `.planning/` state.
3. The IDE or orchestrator runs subagents whose definitions live in `.cursor/agents/`, optionally guided by `.cursor/skills/*/SKILL.md`.
4. Outputs are written under `.planning/` (for example `.planning/codebase/` for codebase maps) or updated via `gsd-tools.cjs` commit/phase helpers when the full GSD lifecycle is in use.

**State management:**
- **Application:** Stateless — no database or in-process session in `index.ts`.
- **GSD:** File-based when expanded — `gsd-tools.cjs` documents commands for `STATE.md`, roadmap, phase directories, todos, and validation; those files are not all present in a fresh repo but the tooling expects them once workflows create them.

## Key Abstractions

**`gsd-tools.cjs` CLI:**
- Purpose: Single entry for GSD filesystem and planning operations (state, roadmap, phase, validate, commit, intel, etc.).
- Examples: `.cursor/get-shit-done/bin/gsd-tools.cjs`, with implementation split across `.cursor/get-shit-done/bin/lib/*.cjs` (`core.cjs`, `phase.cjs`, `roadmap.cjs`, `state.cjs`, and others).
- Pattern: Node CommonJS CLI invoked by workflows and scripts; reduces duplicated bash patterns across GSD commands.

**Workflow document:**
- Purpose: Executable specification for a GSD command flow (purpose, process steps, agent types, expected artifacts).
- Examples: `.cursor/get-shit-done/workflows/map-codebase.md`, `.cursor/get-shit-done/workflows/execute-phase.md`, `.cursor/get-shit-done/workflows/plan-phase.md`.
- Pattern: Markdown with structured tags; references absolute or project-relative paths to `gsd-tools.cjs` and `.planning/`.

**Agent definition:**
- Purpose: Constrain a subagent’s role, tools, and success criteria for one GSD concern.
- Examples: `.cursor/agents/gsd-codebase-mapper.md`, `.cursor/agents/gsd-planner.md`, `.cursor/agents/gsd-executor.md`.
- Pattern: Standalone markdown prompt consumed by the orchestrator when spawning typed agents.

**Skill:**
- Purpose: Reusable, discoverable procedure for a named task (often maps 1:1 to a user-facing GSD capability).
- Examples: `.cursor/skills/gsd-map-codebase/SKILL.md`, `.cursor/skills/gsd-plan-phase/SKILL.md`.
- Pattern: Directory per skill with `SKILL.md` front matter and instructions.

**Codebase map document:**
- Purpose: Durable reference for planners and executors (stack, structure, conventions, concerns).
- Examples: `.planning/codebase/STACK.md`, `.planning/codebase/STRUCTURE.md` (this document’s companion), `.planning/codebase/CONVENTIONS.md`.
- Pattern: Human- and AI-oriented markdown generated or refreshed by mapper workflows.

## Entry Points

**Bun application:**
- Location: `index.ts`
- Triggers: `bun run index.ts` or `bun index.ts`
- Responsibilities: Entire current application behavior (minimal stub).

**GSD tools CLI:**
- Location: `.cursor/get-shit-done/bin/gsd-tools.cjs`
- Triggers: `node .../gsd-tools.cjs <command>` from workflows, scripts, or terminal
- Responsibilities: Planning state, roadmap/phase operations, validation, commits, intel, and related utilities per inline help in the file header.

**Workflow documents:**
- Location: `.cursor/get-shit-done/workflows/*.md`
- Triggers: Slash commands / orchestrator loading a named workflow
- Responsibilities: Step-by-step GSD procedures and agent spawn configuration.

## Error Handling

**Strategy:** Split by layer. The Bun entry does not implement a global error handler; uncaught exceptions propagate to Bun’s default behavior. GSD tooling uses Node CLI patterns (exit codes and thrown errors in `gsd-tools.cjs` / `lib/*.cjs`); workflows typically instruct verification steps after destructive or write operations.

**Patterns:**
- **Application:** No custom `try/catch` in `index.ts` as of this analysis.
- **GSD:** Validate via `gsd-tools.cjs validate ...` subcommands where workflows require consistency checks before proceeding.

## Cross-Cutting Concerns

**Logging:**
- **Application:** `console.log` / standard console APIs in `index.ts`.
- **GSD:** Workflow-driven; no unified app logger — reliance on agent/IDE output and optional `gsd-tools` feedback.

**Validation:**
- **Application:** Not applicable at current scope.
- **GSD:** `gsd-tools.cjs` exposes `validate consistency`, `validate health`, and related checks for `.planning/` integrity when those workflows run.

**Authentication:**
- Not implemented in application code. GSD may reference external APIs (e.g. web search) via `gsd-tools.cjs` when configured; no auth flow in `index.ts`.

---

*Architecture analysis: 2026-04-15*
*Update when major patterns change*
