# Stack Research

**Domain:** Multi-location management, location/user RBAC, location-scoped webhook subscriptions
**Researched:** 2026-04-15
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Bun runtime + `Bun.serve` | 1.3.8 | Keep orchestrator/API runtime for new location and RBAC routes | Already your production path in this lab; Bun docs show mature HTTP routing and no runtime switch cost |
| `bun:sqlite` + SQL migrations | Bundled with Bun 1.3.8 | Persist `locations`, `location_members`, and `location_subscribers` | Matches your current hand-written SQL style, keeps joins and constraints explicit, avoids ORM migration overhead mid-milestone |
| `react-router-dom` | 7.14.1 | Add Locations index + Location detail routes in React | Natural fit for multi-screen/location drill-down navigation; no framework rewrite needed |
| `zod` | 4.3.6 | Validate request payloads for location CRUD, RBAC assignment, and subscription creation | Replaces repetitive manual `typeof` checks in routes with typed schemas shared across server/client |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | 5.99.0 | Cache/invalidate location, member, and subscription server state | Use when CRUD screens are added and stale UI after mutations becomes costly |
| `tiny-invariant` | 1.3.3 | Small invariant checks for route params and required IDs | Use in handlers/hooks for clean fail-fast branches without heavy error framework |
| `@casl/ability` + `@casl/react` | 6.8.0 / 6.0.0 | Optional shared UI capability model (view/hide actions by role) | Use only if role-dependent UI branching grows; server SQL checks remain source of truth |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `bun test` | Validate RBAC and subscription scope regressions | Add integration tests for "user can mutate only allowed location" and fan-out filtering by location |
| SQLite indexes + query planner checks | Keep list pages and fan-out lookups fast | Add composite and partial indexes during migration review (`location_id`, `user_id`, active subscriptions) |

## Installation

```bash
# Core additions
bun add react-router-dom zod

# Supporting additions (recommended for CRUD-heavy screens)
bun add @tanstack/react-query tiny-invariant

# Optional UI capability modeling
bun add @casl/ability @casl/react
```

## Integration Points with Current Architecture

- **Database schema changes (SQLite):**
  - Add `locations` (id, home_id, name, metadata JSON, timestamps).
  - Add `location_members` (location_id, user_id, role, unique(location_id, user_id)).
  - Add `location_subscribers` (location_id, callback_url, active, event_filters JSON).
  - Keep foreign keys enforced; use partial unique index for active subscription uniqueness (for example, one active callback per location/url pair).
- **Bun server route changes:**
  - Extend current route switch with `/locations` CRUD and `/locations/:id/{members,subscribers}` endpoints.
  - Introduce auth-context placeholder (for now: resolved user id from request context/header) and central `requireLocationRole(...)` helper before writes.
  - Keep existing `/events` fan-out path, but resolve subscribers by `location_id` scope before delivery.
- **React app changes:**
  - Move from screen toggle state to route-based navigation (`/locations`, `/locations/:id`).
  - Co-locate query keys by location (`["locations"]`, `["location", id, "members"]`, `["location", id, "subs"]`).
  - Gate edit controls by capability checks; treat UI checks as UX only, never as security.
- **Validation changes:**
  - Replace ad-hoc body parsing in routes with `zod` schemas (`CreateLocationInput`, `AssignRoleInput`, `CreateLocationSubscriberInput`) and return consistent 400 errors.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Hand-written SQL + existing migration style | `drizzle-orm` (0.45.2) | Use if schema complexity accelerates and you want typed query composition across many modules |
| `react-router-dom` | Keep local `useState` screen switching | Only while app has 1-2 screens; multi-location drill-down should use real routes |
| SQL-based RBAC helper functions | External policy engine (`casbin` 5.49.0) | Use later if policies become cross-service or need dynamic policy editing by admins |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Postgres migration in this milestone | Adds infra/deploy complexity without solving immediate local-lab constraints | Keep SQLite and design schema with clear FK/index strategy |
| Redis/job queue for webhook delivery now | Current fan-out path is simple and synchronous; queue infra increases operational surface too early | Keep inline delivery + delivery records; add retries/backoff in-process first |
| Full auth provider rollout (OAuth/OIDC) for this scope | Milestone asks for location/user RBAC, not enterprise identity rollout | Keep minimal user identity context and enforce location-role checks server-side |
| OPA/external policy service | Overkill for single Bun service and SQLite-backed role tables | Keep policy in code + SQL joins, add external policy layer only when services split |

## Stack Patterns by Variant

**If this remains a single-operator lab (near term):**
- Use SQL tables + `requireLocationRole` helper + `zod` validation.
- Because this gives strong enforcement with minimal new moving parts.

**If you later add true multi-user auth sessions:**
- Keep RBAC data model, add auth/session package separately, and map authenticated user id to role checks.
- Because authorization model should stay stable while authentication evolves.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `bun@1.3.8` | `react@19.2.5`, `react-dom@19.2.5` | Current project baseline; no runtime migration needed |
| `react-router-dom@7.14.1` | `react@19.x` | React Router v7 targets modern React and supports incremental adoption |
| `@tanstack/react-query@5.99.0` | `react@18+` (works with 19.x) | Safe for server-state cache around location CRUD |
| `zod@4.3.6` | TypeScript 5.5+ | Aligns with TS-first schema validation and strict typing |

## Sources

- [Bun HTTP server docs](https://bun.sh/docs/api/http) — verified current `Bun.serve` capabilities and routing options (HIGH)
- [Bun SQLite docs](https://bun.sh/docs/api/sqlite) — verified built-in SQLite integration path (HIGH)
- [React Router docs](https://reactrouter.com/home) — verified current v7 guidance for React 19 era routing (HIGH)
- [TanStack Query React overview](https://tanstack.com/query/latest/docs/framework/react/overview) — verified server-state caching approach (HIGH)
- [Zod docs](https://zod.dev/) — verified Zod 4 stability and TS requirements (HIGH)
- [SQLite Foreign Keys](https://sqlite.org/foreignkeys.html) and [Partial Indexes](https://sqlite.org/partialindex.html) — verified FK and partial-index strategy for RBAC/subscription tables (HIGH)
- npm registry versions checked on 2026-04-15: `react-router-dom@7.14.1`, `@tanstack/react-query@5.99.0`, `zod@4.3.6`, `@casl/ability@6.8.0`, `@casl/react@6.0.0` (MEDIUM, registry snapshot)

---
*Stack research for: Home Assist v1.2 location + RBAC + location-scoped webhooks*
*Researched: 2026-04-15*
