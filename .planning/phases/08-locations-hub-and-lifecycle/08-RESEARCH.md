# Phase 8: locations-hub-and-lifecycle - Research

**Researched:** 2026-04-16  
**Domain:** Bun + React location lifecycle and navigation hub  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Hub layout and navigation
- **D-01:** Implement the locations hub as a dense, sortable table-style list optimized for admin workflows (name, status, updated timestamp, key metadata, actions) rather than card-heavy presentation.
- **D-02:** Make row click and explicit "Open" action both navigate into location detail, with consistent empty/loading/error states matching existing app panel conventions.

### Location lifecycle and archive behavior
- **D-03:** Use soft-archive semantics (`archived_at` + optional archive metadata) and never hard-delete in this phase.
- **D-04:** Default hub view shows only active locations; provide an "Include archived" filter/toggle for audit visibility.
- **D-05:** Support archive and restore actions from the hub so lifecycle management stays centralized.

### Create/edit workflow
- **D-06:** Use one shared location form model for both create and edit to keep validation and field behavior consistent.
- **D-07:** Run create/edit in a dedicated detail/edit surface (not inline row editing) so future phase 9/10 expansion can reuse the same structure.
- **D-08:** Validate required fields client-side and server-side, and present inline field errors plus request-level failure feedback.

### Location metadata contract
- **D-09:** Require `name` as the only strict required field in phase 8; keep additional metadata optional but structured for future expansion.
- **D-10:** Include baseline optional metadata fields now (`code/slug`, notes/description) so list/detail UX has stable anchors without over-committing to full domain modeling.

### Access filtering baseline
- **D-11:** Hub queries must be scoped to "locations user can access" from the start, even before full RBAC tooling arrives in phase 10.
- **D-12:** Return access-denied responses as explicit, non-leaky errors and avoid exposing inaccessible location identifiers in list/detail payloads.

### Claude's Discretion
- Exact visual styling tokens, spacing, and iconography as long as they follow existing `events-*`/panel conventions.
- Specific URL shape for navigation state (`path` vs query parameter) as long as deep-link behavior remains stable for location detail.
- Precise naming for optional metadata columns as long as create/edit/list remain internally consistent.

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOC-01 | User can view a unified list of all locations they can access. | Access-scoped list query pattern + hub table UX + default active filter/archived toggle. |
| LOC-02 | User can create a new location with required metadata. | Shared schema-driven form model for create/edit with client+server validation. |
| LOC-03 | User can edit location details for locations they administer. | Same form schema + access checks + optimistic UI refresh pattern. |
| LOC-04 | User can archive a location instead of hard-deleting it. | Soft archive (`archived_at`) lifecycle endpoint + restore action. |
| LOC-05 | Archived locations are excluded from default active views while remaining auditable. | `WHERE archived_at IS NULL` default + include-archived filter and audit visibility query. |
| VIEW-01 | User can open a location detail page from the locations hub. | Row click + explicit open action wired to screen-level route state and deep-link-safe URL shape. |
</phase_requirements>

## Project Constraints (from .cursor/rules/)

- App/runtime scripts should stay Bun-first (no migration to Node/Express/Vite patterns for app runtime) [VERIFIED: `.cursor/rules/gsd-project.md`].
- Prefer explicit, readable code paths over abstracted microservice-style indirection [VERIFIED: `.cursor/rules/gsd-project.md`].
- Planning/execution artifacts are expected to flow through GSD phase docs (`CONTEXT.md`, `RESEARCH.md`, `PLAN.md`) [VERIFIED: `.cursor/rules/gsd-project.md`].
- Existing project skills are workflow-oriented (`gsd-*`) rather than domain-specific UI/data libraries, so phase plans should rely on established in-repo app patterns [VERIFIED: `.cursor/skills/*/SKILL.md` listing + sampled skill docs].

## Summary

Phase 8 should be implemented as an incremental extension of the current Bun + SQLite + React architecture, not a framework shift. The server already uses `Bun.serve` with focused route handlers and explicit JSON error responses, and the client already uses controlled React state with panel/list conventions; those are strong anchors for a locations hub and lifecycle flow [VERIFIED: codebase `src/server.ts`, `src/routes/events.ts`, `src/client/events-screen.tsx`].

The highest-leverage design choice is a unified location domain contract used by both API validation and form UX. A schema-backed contract keeps create/edit behavior consistent (D-06, D-08), prevents drift between client and server validation, and gives stable shape for future phase 9/10 expansion [CITED: https://zod.dev/, VERIFIED: requirements + context decisions].

Soft archive should be first-class in schema and query design (`archived_at`, optional `archived_by`/`archive_reason`), with active-only default queries and an explicit include-archived filter. This directly satisfies LOC-04/LOC-05 while preserving auditability and avoiding destructive lifecycle operations [VERIFIED: requirements + context decisions, CITED: https://sqlite.org/partialindex.html].

**Primary recommendation:** Implement a typed location API + shared schema form flow + access-scoped list queries on top of existing Bun route and React screen patterns, adding only `zod` as new dependency for contract validation [VERIFIED: codebase + npm registry + docs].

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Locations hub list + filters + sort UI | Browser / Client | API / Backend | Rendering/interactions belong in React client, but data source and access scope belong to API [VERIFIED: codebase screen split + D-01/D-11]. |
| Create/edit form UX and inline field feedback | Browser / Client | API / Backend | Controlled form state and inline errors are client concerns; canonical validation and persistence are server concerns [CITED: https://react.dev/learn/sharing-state-between-components, VERIFIED: D-06/D-08]. |
| Location persistence + lifecycle transitions (archive/restore) | API / Backend | Database / Storage | Lifecycle transitions require policy checks and durable writes with audit-safe state [VERIFIED: LOC-04/LOC-05 + context decisions]. |
| Access scoping ("locations user can access") | API / Backend | Database / Storage | Access filtering must be server-enforced and query-bound to avoid data leakage [VERIFIED: D-11/D-12]. |
| Active-vs-archived query performance | Database / Storage | API / Backend | Efficient active list reads should be pushed into SQL/index design [CITED: https://sqlite.org/partialindex.html]. |
| Hub -> detail navigation state | Browser / Client | API / Backend | Navigation state and deep-link shape live in client app state, with API fetch on selected location [VERIFIED: `src/client/main.tsx`, VIEW-01]. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun runtime + `Bun.serve` | 1.3.8 (local runtime) | HTTP server + HTML import serving | Already used in project server and documented as Bun-first server entrypoint [VERIFIED: `bun --version`, codebase `src/server.ts`, CITED: https://bun.sh/docs/api/http]. |
| `bun:sqlite` | Bundled with Bun 1.3.8 | Persistence and query execution | Existing DB layer uses Bun SQLite; supports prepared statements and transactions with no extra service dependency [VERIFIED: `src/db/*`, CITED: https://bun.sh/docs/api/sqlite]. |
| React | 19.2.5 | Client UI for hub/detail navigation and forms | Existing client uses React with controlled state patterns aligned to hub/detail screen orchestration [VERIFIED: `package.json`, `src/client/main.tsx`, CITED: https://react.dev/learn/sharing-state-between-components, VERIFIED: npm registry]. |
| React DOM | 19.2.5 | Browser rendering | Existing client render path uses `createRoot` with React DOM [VERIFIED: `src/client/main.tsx`, `package.json`, VERIFIED: npm registry]. |
| Zod | 4.3.6 | Shared runtime schema validation for create/edit/list payloads | Best fit for D-08 shared client+server validation contract in strict TypeScript codebase [CITED: https://zod.dev/, VERIFIED: npm registry, VERIFIED: project `strict` TS mode]. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@testing-library/react` | 16.3.2 | UI behavior tests for hub/form states | Use for empty/loading/error/form validation rendering checks [VERIFIED: `package.json`, existing tests]. |
| `happy-dom` | 20.9.0 | DOM environment for Bun test runs | Use for client test files that need browser globals [VERIFIED: `src/client/events-screen.test.tsx`, `package.json`]. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod shared schemas | Manual ad-hoc validators per route/form | Lower dependency count but higher drift risk between server and UI validation paths [VERIFIED: existing manual parsing in `src/routes/events.ts`, `src/client/api/events-client.ts`]. |
| Zod shared schemas | Valibot/Yup | Viable, but introduces new conventions not already present; Zod has direct TypeScript-first docs and broad ecosystem [CITED: https://zod.dev/, ASSUMED]. |
| Dedicated table library | Handcrafted sortable table state | For this phase, handcrafted keeps dependencies low and matches existing explicit state pattern [VERIFIED: current UI style in `events-screen.tsx`, ASSUMED]. |

**Installation:**
```bash
npm install zod
```

**Version verification:**  
- `react` latest `19.2.5` published `2026-04-08T18:39:24.455Z` [VERIFIED: npm registry].  
- `react-dom` latest `19.2.5` published `2026-04-08T18:39:31.423Z` [VERIFIED: npm registry].  
- `zod` latest `4.3.6` published `2026-01-22T19:14:35.382Z` [VERIFIED: npm registry].

## Architecture Patterns

### System Architecture Diagram

```text
[User in Browser]
  -> [Locations Hub Screen (table/filter/actions)]
    -> GET /locations?include_archived=0
      -> [Route Handler: access scope + query param validation]
        -> [SQLite locations + membership joins]
          -> [JSON list payload]
    -> POST /locations | PATCH /locations/:id
      -> [Shared schema validation + authorization check]
        -> [SQLite write]
          -> [updated location payload]
    -> POST /locations/:id/archive | POST /locations/:id/restore
      -> [lifecycle guard + soft-archive write]
        -> [active list excludes archived by default]
  -> [Open location action / row click]
    -> [Client screen state + deep-link-safe URL]
      -> [Location Detail Screen entry (Phase 9 expands content)]
```

### Recommended Project Structure
```text
src/
├── client/
│   ├── locations-screen.tsx          # Hub list/filter/actions + navigation
│   ├── location-detail-screen.tsx    # Detail/edit surface entry (Phase 8 scaffold)
│   ├── api/locations-client.ts       # Typed fetch helpers for location endpoints
│   └── lib/location-form.ts          # Shared form model + UI mapping helpers
├── routes/
│   └── locations.ts                  # GET/POST/PATCH/archive/restore handlers
├── db/
│   ├── locations.ts                  # DB helpers and scoped query functions
│   └── migrations/
│       └── 003_locations_lifecycle.sql
└── types/
    └── locations-api.ts              # DTO + schema-inferred TypeScript types
```

### Pattern 1: Shared Schema Contract (Client + Server)
**What:** One schema defines required/optional metadata and is reused in server handlers and client form pre-validation.  
**When to use:** For create/edit requests and any response shape consumed directly by UI.  
**Example:**
```typescript
// Source: https://zod.dev/
import { z } from "zod";

export const LocationWriteSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1).max(64).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type LocationWriteInput = z.infer<typeof LocationWriteSchema>;
```

### Pattern 2: Access-Scoped Repository Queries
**What:** Every list/detail query joins membership scope before returning location rows.  
**When to use:** Any endpoint returning location entities in phase 8+.
**Example:**
```typescript
// Source: project code pattern + LOC-01/D-11 constraints
const sql = `
  SELECT l.id, l.name, l.code, l.archived_at, l.updated_at
  FROM locations l
  JOIN location_members lm ON lm.location_id = l.id
  WHERE lm.user_id = $userId
    AND ($includeArchived = 1 OR l.archived_at IS NULL)
  ORDER BY l.updated_at DESC, l.id DESC
`;
```

### Pattern 3: Soft-Archive Lifecycle Endpoints
**What:** Archive/restore update lifecycle fields instead of deleting rows.  
**When to use:** LOC-04/LOC-05 lifecycle actions from hub.
**Example:**
```typescript
// Source: context decisions D-03/D-05 + SQLite query patterns
db.run(
  `UPDATE locations
   SET archived_at = datetime('now'), archived_by = $userId
   WHERE id = $id AND archived_at IS NULL`,
  { $id: locationId, $userId: actorId },
);
```

### Anti-Patterns to Avoid
- **Hard delete for phase 8 lifecycle:** Violates explicit phase decision and breaks auditability requirements [VERIFIED: D-03, LOC-04/LOC-05].
- **Client-only access filtering:** Leaks inaccessible entities through transport payloads [VERIFIED: D-11/D-12, RBAC roadmap trajectory].
- **Separate create and edit form contracts:** Causes validation drift and doubles future maintenance [VERIFIED: D-06/D-08].
- **Inline row editing as primary workflow:** Conflicts with dedicated detail/edit surface decision and phase 9/10 reuse path [VERIFIED: D-07].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request/form validation | Custom per-field if/else parsing in every route and component | Shared `zod` schemas | Single source of truth for shape + clear error mapping for both tiers [CITED: https://zod.dev/]. |
| Authorization scope checks | Ad-hoc UI-side filtering only | Server-side scoped SQL predicates in every query path | Prevents leakage and enforces policy where trust boundary exists [VERIFIED: D-11/D-12]. |
| Archive semantics | Delete-and-backfill records | `archived_at` lifecycle fields + restore endpoint | Supports audit visibility and future role-based lifecycle operations [VERIFIED: LOC-04/LOC-05, D-03/D-05]. |
| Active list performance tuning later | Full-table scan forever | Targeted indexes, including optional partial index on active rows | SQLite partial indexes are designed for subset-heavy predicates [CITED: https://sqlite.org/partialindex.html]. |

**Key insight:** In this phase, complexity is in consistency and policy boundaries, not raw feature count; shared contracts and scoped query primitives eliminate most hidden rework [VERIFIED: requirements + context decisions].

## Common Pitfalls

### Pitfall 1: Scope Leakage Through Hub List
**What goes wrong:** Hub returns all locations, then UI hides inaccessible rows.  
**Why it happens:** Query path not joined to membership scope, relying on presentation filtering.  
**How to avoid:** Require `user_id`-scoped SQL in repository methods and include denied-path tests.  
**Warning signs:** API payload contains location IDs user should never see.

### Pitfall 2: Archive Toggle Drift
**What goes wrong:** Archived locations appear inconsistently across default and filtered views.  
**Why it happens:** Mixed query predicates across endpoints (`archived_at` condition missing in one path).  
**How to avoid:** Centralize list query builder with explicit `includeArchived` parameter defaulting false.  
**Warning signs:** Count mismatches between refreshed hub and detail navigation.

### Pitfall 3: Create/Edit Contract Divergence
**What goes wrong:** Create accepts a field but edit rejects it (or vice versa).  
**Why it happens:** Separate validation logic and duplicated field metadata.  
**How to avoid:** One schema + one form model for both operations.  
**Warning signs:** Bug reports mention "works on create, fails on edit" validation behavior.

### Pitfall 4: Navigation State Coupled to Temporary Component State
**What goes wrong:** Hub-to-detail deep links break after refresh or direct URL entry.  
**Why it happens:** Selected location held only in transient component state.  
**How to avoid:** Keep route/path-or-query state canonical, with fallback fetch by location ID.  
**Warning signs:** Browser refresh on detail route bounces user to wrong/default view.

## Code Examples

Verified patterns from official sources:

### Bun route + JSON handler shape
```typescript
// Source: https://bun.sh/docs/api/http
const server = Bun.serve({
  fetch(req) {
    if (new URL(req.url).pathname === "/locations" && req.method === "GET") {
      return Response.json([{ id: 1, name: "HQ" }]);
    }
    return new Response("Not Found", { status: 404 });
  },
});
```

### SQLite prepared statement reuse
```typescript
// Source: https://bun.sh/docs/api/sqlite
import { Database } from "bun:sqlite";
const db = new Database("data/home-assist.sqlite", { create: true });
const byId = db.query("SELECT id, name FROM locations WHERE id = $id");
const row = byId.get({ $id: 1 });
```

### React controlled component form field
```typescript
// Source: https://react.dev/learn/sharing-state-between-components
const [name, setName] = useState("");
return <input value={name} onChange={(e) => setName(e.currentTarget.value)} />;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Route-local, manual body parsing for each endpoint | Shared schema validation + inferred TS types | Modern TS API practices (ongoing) | Fewer drift bugs and clearer error contracts [CITED: https://zod.dev/, ASSUMED]. |
| Hard delete lifecycle defaults | Soft archive + audit visibility | Common in admin/audit-heavy CRUD systems | Better traceability and safer recovery paths [ASSUMED]. |
| UI-only permission toggles as protection | Server-enforced scope + UI mirrors policy | Security baseline in multi-scope apps | Eliminates IDOR-style data exposure paths [ASSUMED]. |

**Deprecated/outdated:**
- Hard-deleting primary business entities in management hubs is out of phase scope and conflicts with explicit archive-first requirement [VERIFIED: requirements + D-03].
- Building hub and edit validations separately is outdated for strict TS codebases with shared schema tooling [CITED: https://zod.dev/, ASSUMED].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A lightweight custom sortable table state is preferable to adding a dedicated table library for phase 8 scope. | Standard Stack / Alternatives | Could increase implementation effort if accessibility/sorting complexity is underestimated. |
| A2 | `location_members`-style membership table extension is the preferred near-term access model before full RBAC phase. | Architecture Patterns | May require plan adjustment if user identity model differs from current assumptions. |
| A3 | Optional archive metadata fields (`archived_by`, `archive_reason`) should be introduced now rather than later. | Architecture Patterns | Could introduce unnecessary migration complexity if audit metadata is intentionally deferred. |
| A4 | Full server-side policy shape for roles is intentionally deferred to phase 10 while still enforcing basic access scope now. | Summary / Security | If policy expectations are stricter in phase 8, plan underestimates scope. |

## Open Questions

1. **What user identity source should phase 8 use for "locations user can access"?**
   - What we know: `home_members` exists and no full RBAC policy layer is implemented yet [VERIFIED: `001_initial.sql`, roadmap].
   - What's unclear: canonical actor resolution mechanism for request context (header, session, fixed dev user, etc.) [VERIFIED: no auth middleware found in `src/server.ts`].
   - Recommendation: lock a temporary actor-context contract in planning (e.g., dev header/user ID injection) and mark for replacement in phase 10.

2. **Should `code/slug` be unique globally or unique only among active locations?**
   - What we know: optional `code/slug` is included by decision D-10 [VERIFIED: context].
   - What's unclear: uniqueness rule impacts DB constraints and archive/restore behavior.
   - Recommendation: choose one explicit uniqueness policy before migration task breakdown.

3. **How deep should phase 8 detail screen go beyond navigation entry?**
   - What we know: VIEW-02/03 are in phase 9, so phase 8 detail is primarily entry scaffold [VERIFIED: roadmap + requirements].
   - What's unclear: whether minimal metadata display is required now.
   - Recommendation: implement lightweight detail shell with selected location summary only, defer scoped lists to phase 9.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Server/client runtime, tests, migrations | ✓ | 1.3.8 | — |
| Node.js | GSD/tooling scripts | ✓ | v22.14.0 | — |
| npm | Registry version checks/new package install | ✓ | 11.11.1 | Bun package commands acceptable for install flow |
| SQLite service | Persistence | ✓ (embedded via `bun:sqlite`) | Bundled with Bun | — |

**Missing dependencies with no fallback:**
- None identified for phase 8 baseline implementation.

**Missing dependencies with fallback:**
- None identified.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `bun:test` + `@testing-library/react` + `happy-dom` |
| Config file | `bunfig.toml` (env bundler config) |
| Quick run command | `bun test src/db/migrate.test.ts src/client/events-screen.test.tsx` |
| Full suite command | `bun test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOC-01 | Access-scoped hub list renders active locations by default | integration + UI | `bun test src/routes/locations.test.ts src/client/locations-screen.test.tsx -t "default active list"` | ❌ Wave 0 |
| LOC-02 | Create location with required metadata | route + DB | `bun test src/routes/locations.test.ts -t "create location"` | ❌ Wave 0 |
| LOC-03 | Edit location details with admin scope | route + DB | `bun test src/routes/locations.test.ts -t "edit location"` | ❌ Wave 0 |
| LOC-04 | Archive location (soft) not hard delete | DB + route | `bun test src/routes/locations.test.ts -t "archive location"` | ❌ Wave 0 |
| LOC-05 | Archived hidden by default, visible when included | integration + UI | `bun test src/routes/locations.test.ts src/client/locations-screen.test.tsx -t "include archived"` | ❌ Wave 0 |
| VIEW-01 | Hub row/open action navigates to detail screen | UI navigation | `bun test src/client/main.locations-nav.test.tsx -t "open location detail"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** phase-targeted tests touched by the task (one route test + one UI test where applicable).
- **Per wave merge:** `bun test`.
- **Phase gate:** full suite green plus explicit manual smoke (hub list/create/edit/archive/open detail).

### Wave 0 Gaps
- [ ] `src/routes/locations.test.ts` - lifecycle and access-scoped API contract coverage.
- [ ] `src/client/locations-screen.test.tsx` - hub states, filters, archive/restore UI flows.
- [ ] `src/client/main.locations-nav.test.tsx` - hub-to-detail navigation regression checks.
- [ ] Shared test fixtures for seeded users/locations/memberships in DB helper test utilities.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (phase 8 does not introduce full auth system) | Reuse current actor-context mechanism, keep upgrade path for phase 10 |
| V3 Session Management | no (not in this phase scope) | N/A in this phase |
| V4 Access Control | yes | Enforce location scope in server query predicates and mutation guards |
| V5 Input Validation | yes | Shared schema validation (Zod) + DB constraints |
| V6 Cryptography | no (no new crypto in this phase) | N/A |

### Known Threat Patterns for Bun + SQLite + React location hub

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Insecure direct object reference on location ID | Information Disclosure | Always verify user-location membership before list/detail/mutate responses |
| Mass assignment of privileged location fields | Tampering | Whitelist schema fields and reject unknown/uneditable keys |
| SQL injection through filters/search | Tampering | Prepared statements with bound parameters (`db.query`/`db.run`) |
| Archived record leakage in default views | Information Disclosure | Default `archived_at IS NULL` filter with explicit include toggle |
| Enumeration via error messages | Information Disclosure | Return generic access denied/not found without exposing inaccessible IDs |

## Sources

### Primary (HIGH confidence)
- [Bun HTTP docs](https://bun.sh/docs/api/http) - `Bun.serve`, route handler conventions, server configuration.
- [Bun SQLite docs](https://bun.sh/docs/api/sqlite) - prepared statements, transactions, SQLite runtime behavior in Bun.
- [React docs](https://react.dev/learn/sharing-state-between-components) - controlled components, lifted state, single source of truth.
- [SQLite partial indexes](https://sqlite.org/partialindex.html) - active-subset index strategy for archived filters.
- npm registry lookups (`npm view`) - latest versions and publish timestamps for `react`, `react-dom`, `zod`.
- Local codebase (`src/server.ts`, `src/routes/events.ts`, `src/client/main.tsx`, `src/client/events-screen.tsx`, `src/db/migrations/*.sql`, `package.json`) for existing architecture and patterns.

### Secondary (MEDIUM confidence)
- None needed beyond primary sources for this phase.

### Tertiary (LOW confidence)
- Tradeoff judgments where no project-specific benchmark exists (documented as assumptions).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing stack is explicit in codebase and verified with current registry versions.
- Architecture: HIGH - Locked decisions and current routing/UI patterns strongly constrain implementation shape.
- Pitfalls: MEDIUM - Derived from current architecture plus common lifecycle/access failure patterns.

**Research date:** 2026-04-16  
**Valid until:** 2026-05-16
