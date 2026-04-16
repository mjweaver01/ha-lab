# Architecture Research

**Domain:** Home Assist Lab v1.2 integration (multi-location management, RBAC, location-scoped subscriptions)
**Researched:** 2026-04-15
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         React Client (existing app)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Locations Hub  Location Detail  Membership/Role UI  Subscription UI       │
│       │               │                 │                  │                │
├───────┴───────────────┴─────────────────┴──────────────────┴────────────────┤
│                      Bun HTTP Orchestrator (monolith)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Route handlers  →  Auth Context  →  Permission Service  →  Domain Services │
│  (/locations, /events, /subscribers)   (role checks)       (location/event) │
├─────────────────────────────────────────────────────────────────────────────┤
│                               SQLite Storage                               │
│  homes/users/home_members + locations/location_members + events/subscribers │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `src/server.ts` | HTTP routing composition and request lifecycle | Keep as thin router; add new route registrations |
| `src/routes/*` | Request validation and HTTP response mapping | Extend existing route style; delegate business logic |
| `src/auth/*` (new) | Resolve current user and central permission checks | Small request-context parser + policy module |
| `src/services/*` (new) | Location CRUD, membership, subscription logic | SQL-backed functions called by routes |
| `src/webhooks/fan-out.ts` | Dispatch to subscribers and persist delivery records | Modify query scope from home to location |
| `src/client/api/*` | Typed client calls for locations/events/subscriptions | Follow existing events-client parsing pattern |
| `src/client/hooks/*` | Data loading/mutation and optimistic refresh | Build `use-locations`, `use-location-detail` hooks |

## Recommended Project Structure

```
src/
├── auth/                    # request identity + permission policy
│   ├── request-user.ts      # maps request to current user id
│   └── permissions.ts       # canRead/canManage checks by location role
├── services/                # domain logic beyond route parsing
│   ├── locations.ts         # location CRUD + list/detail queries
│   ├── memberships.ts       # role assignment and membership lifecycle
│   └── subscriptions.ts     # location-scoped subscriber lifecycle
├── routes/
│   ├── locations.ts         # GET/POST/PATCH location endpoints
│   ├── location-members.ts  # membership + role mutation endpoints
│   ├── events.ts            # modified: location-aware list/ingest
│   └── subscribers.ts       # modified: location-aware registration
├── db/
│   ├── migrations/          # add locations/rbac/location-scope migration(s)
│   └── homes.ts             # keep; add helpers only if still used by seeds
└── client/
    ├── api/locations-client.ts
    ├── api/subscriptions-client.ts
    ├── hooks/use-locations.ts
    ├── hooks/use-location-detail.ts
    └── locations-*.tsx      # locations hub/detail/manage screens
```

### Structure Rationale

- **`auth/`:** RBAC rules should not be duplicated inside each route.
- **`services/`:** Existing code inlines SQL in routes; location + RBAC logic is complex enough to merit shared service boundaries.
- **`routes/`:** Keep current style for consistency, but reduce responsibilities to validation + response shaping.
- **`client/api` + `client/hooks`:** Reuse current polling/client parsing patterns while adding location-aware queries/mutations.

## Architectural Patterns

### Pattern 1: Policy Enforcement at Route Boundary

**What:** Route resolves actor once, then calls central permission helpers before any write/read.
**When to use:** All location-scoped CRUD, membership updates, subscriber management, and event reads.
**Trade-offs:** Slight boilerplate per endpoint, but prevents authorization drift.

**Example:**
```typescript
const actor = requireActor(req); // 401 if missing
const locationId = parseLocationId(req);
if (!canManageLocation(db, actor.userId, locationId)) {
  return json({ error: "forbidden" }, 403);
}
return updateLocation(db, locationId, body);
```

### Pattern 2: Location-Scoped Event Pipeline

**What:** Every event carries `location_id`; fan-out and event reads filter by `location_id`.
**When to use:** Ingest (`POST /events`), list (`GET /events`), webhook delivery selection.
**Trade-offs:** Requires migration/backfill for existing home-only rows; pays off with strict isolation.

**Example:**
```typescript
// event insert
INSERT INTO events (home_id, location_id, event_type, body) VALUES ($h, $l, $t, $b);

// fan-out query
SELECT id, callback_url FROM subscribers WHERE location_id = $locationId;
```

### Pattern 3: Role Matrix + Minimal Roles

**What:** Store single role per `(location_id, user_id)` and map to capability matrix in code.
**When to use:** Membership and permissions for UI actions and API checks.
**Trade-offs:** Easy reasoning and testability; less flexible than custom ACL but sufficient for v1.2.

## Data Flow

### Request Flow

```
[User action in Locations UI]
    ↓
[client/api call] → [route handler] → [auth context + policy] → [service] → [SQLite]
    ↓                      ↓                 ↓                    ↓
[UI state refresh] ← [HTTP response] ← [allowed/forbidden] ← [query/mutation]
```

### State Management

```
[React hook state]
    ↓ (fetch/mutate)
[locations-client/subscriptions-client] → [API]
    ↓
[setState + refetch detail/list]
```

### Key Data Flows

1. **Location CRUD:** UI mutation -> route validation -> `canManageLocation` -> `locations` write -> list/detail refetch.
2. **Role assignment:** UI membership action -> role policy check (admin/owner) -> `location_members` update -> permission cache refresh.
3. **Location-scoped subscriptions:** UI create/update -> permission check -> `subscribers.location_id` write -> event fan-out selects only that location.
4. **Location event access:** UI selects location -> `GET /events?location_id=` -> membership check -> location-filtered rows.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single Bun process + SQLite is fine; prioritize clear indexes (`location_members`, `events.location_id`, `subscribers.location_id`) |
| 1k-100k users | Add pagination windows for location lists/events; cache membership checks in-request; optimize hot queries |
| 100k+ users | Consider DB split/move to Postgres and decouple webhook dispatcher worker; keep same service boundaries |

### Scaling Priorities

1. **First bottleneck:** Event reads and fan-out scans without location indexes.
2. **Second bottleneck:** Repeated role lookups across many API calls; add lightweight membership caching per request.

## Anti-Patterns

### Anti-Pattern 1: Home-Level Authorization for Location Endpoints

**What people do:** Check only `home_members` and allow all location operations.
**Why it's wrong:** User gets access to locations they should only view or not see.
**Do this instead:** Enforce `location_members.role` capability matrix for every location-scoped action.

### Anti-Pattern 2: Partial Scope Migration (`home_id` in some paths, `location_id` in others)

**What people do:** Add `location_id` to CRUD but keep fan-out and event reads on `home_id`.
**Why it's wrong:** Cross-location data leakage and confusing UI behavior.
**Do this instead:** Gate rollout with migration + dual-read compatibility window, then cut over all event/subscriber queries to `location_id`.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Subscriber webhook endpoints | Existing HTTP POST callback flow | No protocol change required; payload should include `location_id` |
| Simulated node script | Existing `POST /events` producer | Add `location_id` flag and default seed mapping for local demos |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `routes/*` ↔ `auth/permissions` | Direct function call | Centralizes RBAC; routes stay thin |
| `routes/*` ↔ `services/*` | Direct function call | Keeps SQL and business rules reusable |
| `routes/events.ts` ↔ `webhooks/fan-out.ts` | Existing function call | Change function contract to include `location_id` |
| `client/hooks/*` ↔ `client/api/*` | Typed fetch wrappers | Mirror existing events-client parse/validate pattern |

## New vs Modified Components (Concrete Map)

| Area | New Components | Modified Components |
|------|----------------|---------------------|
| Data model | `locations`, `location_members` tables; role check constraints/indexes | `events` add `location_id`; `subscribers` add/shift to `location_id`; backfill + compatibility migration |
| Backend HTTP | `src/routes/locations.ts`, `src/routes/location-members.ts` | `src/server.ts` route map, `src/routes/events.ts`, `src/routes/subscribers.ts` |
| Backend domain | `src/auth/request-user.ts`, `src/auth/permissions.ts`, `src/services/{locations,memberships,subscriptions}.ts` | `src/webhooks/fan-out.ts` location-scoped query/payload |
| Client wiring | `src/client/api/{locations,subscriptions}-client.ts`, `src/client/hooks/use-locations.ts`, new locations screens | `src/client/main.tsx` navigation shell, events hooks/API to pass `location_id` |
| Tooling/tests | New migration file(s) and role/service tests | Existing integration tests expanded for forbidden/allowed + location fan-out isolation |

## Recommended Build Order (with Dependencies + Verification)

1. **Schema foundation + migration safety**
   - Add `locations` and `location_members`.
   - Add `location_id` to `events` and `subscribers` (nullable during transition), then backfill for existing rows.
   - Verification: migration test proves idempotent upgrade and valid FK/index state.

2. **RBAC core (read-only checks first)**
   - Implement request actor resolution and permission matrix (`viewer`, `operator`, `admin`, `owner`).
   - Wire checks into read paths (`GET /events`, location detail/list).
   - Verification: route/unit tests for 401/403/200 across roles.

3. **Location CRUD + membership management**
   - Ship location list/detail/create/update endpoints and membership role update APIs.
   - Keep UI behind API completeness to avoid speculative client state shapes.
   - Verification: integration tests for create/edit/list + role update permission boundaries.

4. **Location-scoped subscriptions + fan-out cutover**
   - Update `POST /subscribers` and fan-out query to scope on `location_id`.
   - Include `location_id` in outbound payload and delivery audit checks.
   - Verification: integration test with two locations confirms no cross-location webhook delivery.

5. **Client integration and navigation**
   - Add Locations hub, detail view, role-aware action controls, subscription form.
   - Update events screen hooks to fetch by selected `location_id`.
   - Verification: client tests for route wiring and hidden/disabled actions by role; manual smoke for end-to-end location event isolation.

6. **Compatibility cleanup**
   - Remove temporary home-only compatibility branches once client and simulator send `location_id`.
   - Enforce NOT NULL on `events.location_id` and `subscribers.location_id`.
   - Verification: migration + integration tests pass with strict location scope.

## Sources

- Internal architecture and requirements from `.planning/PROJECT.md` (v1.2 scope and constraints)
- Current implementation boundaries from `src/server.ts`, `src/routes/events.ts`, `src/routes/subscribers.ts`, `src/webhooks/fan-out.ts`
- Current schema and migration baseline from `src/db/migrations/001_initial.sql`, `src/db/migrations/002_events_subscribers.sql`
- Current client integration patterns from `src/client/main.tsx`, `src/client/hooks/use-events-poll.ts`, `src/client/api/events-client.ts`

---
*Architecture research for: v1.2 location management + RBAC + location-scoped subscriptions*
*Researched: 2026-04-15*
