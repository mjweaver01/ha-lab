# Project Research Summary

**Project:** Home Assist Lab
**Domain:** Multi-location event orchestration with location-scoped RBAC and webhooks
**Researched:** 2026-04-15
**Confidence:** HIGH

## Executive Summary

Home Assist v1.2 is now a multi-location operations product, not just a single-home event viewer. Expert implementations in this space treat location as a first-class boundary for navigation, authorization, and event delivery: users work within a location context, permissions are evaluated per location membership, and subscriptions receive only location-scoped events.

The recommended approach is to keep the current Bun + SQLite monolith, add explicit `locations` and `location_members` modeling, and centralize policy enforcement in server-side permission helpers before every location-scoped read/write. On the client side, move to route-based location flows and location-keyed API state, while keeping UI role gating as UX-only and server checks as the source of truth.

The primary risks are partial tenantization, migration integrity drift, and webhook scope leakage during retries/fan-out. Mitigation is clear: use expand-migrate-contract for schema rollout, enforce deny-by-default policy checks at route boundaries, require `location_id` through ingest/read/fan-out paths, and add explicit cross-location negative tests plus delivery/audit telemetry.

## Key Findings

### Recommended Stack

Research strongly supports staying on the existing stack and adding focused libraries rather than replatforming. Bun runtime + `bun:sqlite` keep operational complexity low for this milestone, while `react-router-dom` and `zod` address the main functional gaps (multi-screen location navigation and consistent request validation). `@tanstack/react-query` is the recommended supporting layer once location CRUD/mutations increase server-state churn.

**Core technologies:**
- `Bun.serve` + Bun 1.3.8: continue API/orchestrator runtime with minimal migration risk.
- `bun:sqlite` + SQL migrations: enforce location/membership/subscriber integrity with FK and index control.
- `react-router-dom` 7.14.1: model locations hub/detail navigation explicitly.
- `zod` 4.3.6: normalize payload validation for location CRUD, RBAC assignment, and subscriptions.
- `@tanstack/react-query` 5.x (recommended): improve cache invalidation for location/member/subscription mutations.

### Expected Features

v1.2 MVP must deliver complete location-scoped operations and permission enforcement. Feature research is explicit that role-based location access and location-scoped webhooks are table stakes, not differentiators, once multi-location workflows are introduced.

**Must have (table stakes):**
- Locations hub plus create/edit/archive management flow.
- Per-location detail views for devices/users.
- Location membership with predefined roles and strict server-side RBAC enforcement.
- Location-scoped webhook subscription CRUD (URL, event filters, enabled/paused).
- Basic delivery visibility (last status, last success/failure).

**Should have (competitive):**
- Effective permissions preview per user/location.
- Webhook test delivery and health insights.
- Time-bounded delegated location admin grants.

**Defer (v2+):**
- Subscription templates across many locations.
- Cross-location aggregate operations dashboard.
- Per-user custom action-by-action permission toggles (avoid for v1.2 due to policy sprawl risk).

### Architecture Approach

Architecture research recommends a thin-route pattern: routes handle parsing/response, new `auth/` and `services/` layers own policy and domain logic, and the event/subscriber pipeline is fully cut over to `location_id` filtering. Major components should be: (1) location and membership schema/migrations with deterministic backfill, (2) centralized permission layer (`requireActor` + capability matrix), (3) location-scoped subscriptions and fan-out dispatch with delivery records, and (4) route-based client surfaces with location-aware API hooks.

**Major components:**
1. `db/migrations` + schema updates - add and enforce `locations`, `location_members`, `events.location_id`, `subscribers.location_id`.
2. `auth/` policy layer - resolve actor and evaluate location capabilities consistently.
3. `services/` domain layer - location CRUD, memberships, subscription lifecycle logic.
4. `routes/*` + `webhooks/fan-out` - enforce policy at boundary and scope dispatch/read paths to `location_id`.
5. `client/api` + `client/hooks` + routes - location hub/detail UX with role-aware controls.

### Critical Pitfalls

1. **Partial tenantization** - prevent by building a scope matrix and requiring location checks on every endpoint, retry path, and fan-out job.
2. **RBAC role/exception sprawl** - prevent by defining capabilities first and mapping a small role catalog in a single policy layer.
3. **Migration integrity breakage** - prevent with expand-migrate-contract, deterministic backfill, FK enforcement, and integrity verification gates.
4. **Subscription scope drift** - prevent by persisting `location_id` on events and subscriptions and re-checking scope in create/update/retry/replay paths.
5. **Webhook semantics/security gaps** - design for at-least-once/out-of-order delivery and enforce raw-body signature verification plus per-location secret hygiene.

## Implications for Roadmap

Based on dependencies across stack, features, architecture, and pitfalls, v1.2 should be phased as follows:

### Phase 1: Data Model and Scope Foundation
**Rationale:** All feature work depends on trustworthy location identity and membership boundaries.
**Delivers:** `locations`, `location_members`, `location_id` expansion on events/subscribers, backfill plan, indexes/FKs.
**Addresses:** Locations hub prerequisites, per-location views prerequisites, RBAC prerequisites.
**Avoids:** Migration integrity breakage, partial tenantization.

### Phase 2: Authorization Core and Policy Enforcement
**Rationale:** Server-side RBAC must precede broad CRUD and UI gating to avoid false security.
**Delivers:** Actor resolution, capability matrix, centralized permission helpers, deny-by-default coverage for location endpoints.
**Uses:** Bun route boundaries + SQL membership checks + zod validation.
**Implements:** `auth/` policy boundary pattern.
**Avoids:** Role sprawl and ad-hoc conditional authorization.

### Phase 3: Location Management and Membership UX/API
**Rationale:** Once policy is reliable, location CRUD and member-role operations can ship safely.
**Delivers:** Location list/detail/create/update/archive endpoints and UI, membership assignment flow, permission-aware UX states.
**Addresses:** Locations hub, location details, location/user RBAC table stakes.
**Avoids:** Dangerous delete semantics via archive-first lifecycle.

### Phase 4: Location-Scoped Subscription and Dispatch Cutover
**Rationale:** Subscription logic depends on both location data model and RBAC controls.
**Delivers:** Location-scoped subscriber CRUD, fan-out filtering by `location_id`, location-tagged payloads, delivery status visibility.
**Addresses:** Location webhook subscriptions + operability baseline.
**Avoids:** Subscription scope drift and cross-location data leakage.

### Phase 5: Reliability, Security, and Audit Hardening
**Rationale:** Delivery and authorization correctness must be provable before milestone close.
**Delivers:** Duplicate/out-of-order handling tests, retry/replay safeguards, signature verification hardening, structured audit logs for authz + dispatch.
**Addresses:** Webhook reliability fundamentals and operational trust.
**Avoids:** Exactly-once assumptions, weak trust boundary, low forensic visibility.

### Phase Ordering Rationale

- The order follows hard dependencies: schema/scope -> policy -> CRUD UX -> scoped dispatch -> hardening.
- It aligns with architecture boundaries so each phase can ship and verify independently.
- It directly maps to top pitfalls, reducing risk at the point each risk first appears.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4:** Delivery architecture details (inline vs outbox/worker) and replay/retry contract trade-offs.
- **Phase 5:** Signature verification implementation details (raw-body handling) and secret rotation runbooks.

Phases with standard patterns (can likely skip dedicated research-phase):
- **Phase 1:** SQLite migration/index/FK patterns are well-documented and already consistent with current codebase style.
- **Phase 2:** Route-boundary RBAC/capability-matrix enforcement is established and sufficiently documented for implementation.
- **Phase 3:** CRUD + role-aware UI patterning is straightforward once phases 1-2 are complete.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack recommendations are grounded in current codebase fit and official Bun/SQLite/React Router/Zod docs. |
| Features | MEDIUM | Table stakes are clear, but some differentiators depend on adoption context and support volume not yet measured in this lab. |
| Architecture | HIGH | Recommendations are anchored to current repository structure and include concrete component-level migration guidance. |
| Pitfalls | MEDIUM-HIGH | Risks are well-supported by official security/webhook guidance; some operational thresholds remain implementation-specific. |

**Overall confidence:** HIGH

### Gaps to Address

- **Authentication source of truth:** Current research assumes request actor resolution exists; define exact auth/session mechanism before broad RBAC rollout.
- **Delete/archive retention policy:** Archive-first is recommended, but retention windows and purge triggers need explicit product decisions.
- **Async dispatch boundary:** Decide whether v1.2 keeps synchronous delivery with safeguards or introduces an outbox worker in-milestone.
- **Legacy backfill mapping:** Confirm deterministic mapping from existing home-scoped rows to location-scoped rows before enforcing NOT NULL cutover.

## Sources

### Primary (HIGH confidence)
- Internal project context from `.planning/PROJECT.md` and current code structure in `src/server.ts`, `src/routes/*`, `src/webhooks/fan-out.ts`, `src/client/*`.
- [Bun HTTP docs](https://bun.sh/docs/api/http) - runtime and routing capabilities.
- [Bun SQLite docs](https://bun.sh/docs/api/sqlite) - embedded SQLite integration and usage model.
- [React Router docs](https://reactrouter.com/home) - route-first navigation patterns.
- [Zod docs](https://zod.dev/) - schema validation patterns.
- [SQLite foreign keys](https://sqlite.org/foreignkeys.html) and [partial indexes](https://sqlite.org/partialindex.html) - integrity and performance strategy.
- [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks) and [redelivery guidance](https://docs.github.com/en/webhooks/using-webhooks/automatically-redelivering-failed-deliveries-for-a-github-app-webhook).
- [Shopify webhook best practices](https://shopify.dev/docs/apps/webhooks/best-practices).
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

### Secondary (MEDIUM confidence)
- [TanStack Query React overview](https://tanstack.com/query/latest/docs/framework/react/overview) - client state strategy guidance.
- [SmartThings enterprise accounts/resources](https://developer.smartthings.com/docs/enterprise/accounts/enterprise-accounts) and [RBAC docs](https://developer.smartthings.com/docs/enterprise/accounts/role-based-access) - comparative scope and role patterns.
- [Auth0 RBAC fundamentals](https://auth0.com/docs/manage-users/access-control/rbac) - capability/role framing.
- [Stripe webhooks duplicate/order/signature guidance](https://docs.stripe.com/webhooks#handle-duplicate-events) - reliability and trust model behavior.

### Tertiary (LOW confidence)
- [Hook0 multi-tenant webhook architecture](https://documentation.hook0.com/how-to-guides/multi-tenant-architecture/) - useful pattern references, but vendor-specific and should be validated against in-repo constraints.

---
*Research completed: 2026-04-15*
*Ready for roadmap: yes*
