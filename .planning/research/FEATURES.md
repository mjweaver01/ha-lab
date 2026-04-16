# Feature Research

**Domain:** Multi-location home/IoT operations (location management + location-scoped RBAC + location-scoped webhooks)
**Researched:** 2026-04-15
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Locations hub (list + quick switch) | Comparable systems treat location as first-class navigation and organization boundary. | LOW | Needs sortable/searchable location list and clear active location context. |
| Location CRUD with safe delete behavior | Users expect to create/rename/archive locations as org changes. | MEDIUM | Delete/archive must handle dependent users/devices/subscriptions; archive-first is safer than hard delete. |
| Per-location detail views (devices + users) | SmartThings/HA style workflows center around scoped inventory per location/area. | MEDIUM | Separate tabs/panels for devices and users; include counts/status to avoid deep-click discovery. |
| Location membership management | Multi-user systems expect invite/remove and per-location membership visibility. | MEDIUM | Membership should be location-scoped (not global-only), with explicit active/invited states. |
| Baseline RBAC roles (Owner/Admin/Operator/Viewer) | Users expect role templates rather than bespoke permission editing. | HIGH | Role assignment at location scope; enforce in API and UI (hide/disable unavailable actions). |
| Location-scoped webhook subscriptions (CRUD) | Webhook consumers expect endpoint + events + enabled flag per scope. | HIGH | Subscription object should include location_id, event filters, destination URL, signing secret metadata, enabled/paused state. |
| Webhook reliability fundamentals (delivery status, retries, idempotency expectations) | Industry webhook docs treat delivery observability and replay handling as required ops behavior. | HIGH | At minimum: delivery log per subscription, retry outcome, and duplicate-safe event identifiers. |
| Permission-aware UX (no surprise 403s) | Users expect UI to match their role capabilities. | MEDIUM | Disable or omit prohibited actions preemptively; return clear unauthorized messages when attempted via API. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Effective access preview ("what can this user do in this location?") | Dramatically reduces RBAC misconfiguration and support burden. | MEDIUM | Read-only matrix view of computed permissions per user/location/action set. |
| Delegated location admin with expiry | Lets temporary operators/installers self-serve without permanent over-permissioning. | MEDIUM | Time-bounded role grants and auto-expiry align with enterprise patterns. |
| Webhook "test delivery" and health score per location | Faster setup validation and lower debugging friction for integrators. | MEDIUM | Send signed ping/test event; show rolling success rate and last error class. |
| Per-location subscription templates | Speeds rollout across many locations while preserving local overrides. | HIGH | Clone event selection + headers + retry policy into new location subscriptions. |
| Cross-location operations dashboard (read-only aggregate) | Gives operators fleet visibility without breaking location isolation model. | MEDIUM | Aggregated metrics and drill-down links; no write actions unless elevated global role. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-user custom permission toggles for every action | Feels "flexible" for edge cases. | Causes role explosion, inconsistent access reasoning, and brittle audits. | Keep small role catalog + narrowly scoped exceptions with expiry and reason. |
| Single global webhook stream for all locations | Looks easier to set up once. | Breaks tenant/location isolation, increases accidental data leakage risk, and complicates downstream routing. | Enforce location-scoped subscriptions; allow optional aggregate stream only for explicit global admin use cases. |
| Synchronous webhook fan-out in primary request path | Seems simpler than queueing. | Slow/failed receivers degrade core app responsiveness and create cascading failures. | Persist event, ack quickly, deliver asynchronously with retry/backoff and delivery logs. |
| Hard-deleting locations by default | Requested to "keep things clean." | Destroys traceability and breaks historical deliveries/audit interpretation. | Soft-delete/archive with explicit purge workflow and dependency checks. |

## Feature Dependencies

```
Location model + CRUD
    └──requires──> Existing home/account model
                       └──enables──> Per-location device/user views
                                          └──requires──> Location membership model

Location membership model
    └──requires──> RBAC role catalog
                       └──requires──> Permission enforcement in API
                                          └──enables──> Permission-aware UI

Location-scoped event taxonomy
    └──requires──> Location-scoped webhook subscriptions
                       └──requires──> Delivery pipeline (async + retry + logs)

Webhook test delivery/health
    └──enhances──> Location-scoped webhook subscriptions

Per-user custom permission toggles
    ──conflicts──> Stable role catalog + auditable RBAC
```

### Dependency Notes

- **Per-location views require location model first:** Device/user pages need canonical `location_id` ownership and lifecycle semantics.
- **RBAC must be enforced server-side before UI polish:** UI gating without backend enforcement creates false security.
- **Location-scoped subscriptions require location-scoped event payloads:** Events must carry location identity to route safely.
- **Delivery logs depend on persisted delivery attempts:** Retry and health UX are not credible without attempt-level storage.
- **Custom per-user permission editing conflicts with operable RBAC:** It introduces combinatorial policy sprawl.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Locations hub + location CRUD (create/edit/archive) — establishes the primary management surface.
- [ ] Per-location devices/users views — validates location drill-down utility.
- [ ] Location-scoped role assignment with 3-4 predefined roles — delivers practical access control without role sprawl.
- [ ] Location-scoped webhook subscription CRUD (URL, events, enable/disable) — proves core per-location event push model.
- [ ] Basic delivery visibility (last status, last success/failure) — makes subscriptions operable, not black-box.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Test delivery + manual redelivery controls — add once baseline deliveries are stable.
- [ ] Effective permissions preview — add when support friction appears around role expectations.
- [ ] Time-bounded delegated roles — add when temporary staff/installer workflows are common.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Subscription templates across many locations — useful at larger fleet scale.
- [ ] Read-only cross-location operations cockpit — useful once there are enough locations to justify aggregate ops.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Locations hub + CRUD | HIGH | MEDIUM | P1 |
| Per-location devices/users views | HIGH | MEDIUM | P1 |
| Location-scoped RBAC roles + enforcement | HIGH | HIGH | P1 |
| Location-scoped webhook subscription CRUD | HIGH | HIGH | P1 |
| Delivery status visibility | HIGH | MEDIUM | P1 |
| Test delivery + redelivery | MEDIUM | MEDIUM | P2 |
| Effective permissions preview | MEDIUM | MEDIUM | P2 |
| Subscription templates | MEDIUM | HIGH | P3 |
| Cross-location aggregate dashboard | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Comparable System A | Comparable System B | Our Approach |
|---------|---------------------|---------------------|--------------|
| Location hierarchy + scoped inventory | SmartThings: account -> location group -> location -> room, with API support for scoped resources. | Home Assistant: areas/floors as primary organization and action scope. | Keep simple hierarchy (home -> location -> devices/users) with clean location drill-down first. |
| Location/user RBAC | SmartThings Enterprise roles applied at account/group/location levels. | Home Assistant permission model supports area/device/entity policy checks (developer docs; noted as experimental there). | Start with location-scoped predefined roles and strict server enforcement; avoid free-form policy editing initially. |
| Scoped webhook subscriptions | GitHub/Shopify patterns: subscribe only to needed events, use secrets, support retries/redelivery workflows. | Hook0 multi-tenant pattern: labels/scope keys per tenant/resource with delivery visibility. | Model subscriptions as location-scoped resources with minimal event selection, secreted delivery, and status visibility. |

## Sources

- Home Assistant Areas docs (official): https://www.home-assistant.io/docs/organizing/areas/ (HIGH)
- Home Assistant developer permissions docs (official, marked experimental): https://developers.home-assistant.io/docs/auth_permissions/ (MEDIUM)
- SmartThings Enterprise accounts/resources (official): https://developer.smartthings.com/docs/enterprise/accounts/enterprise-accounts (HIGH)
- SmartThings Enterprise role-based access (official): https://developer.smartthings.com/docs/enterprise/accounts/role-based-access (HIGH)
- SmartThings release notes (official; confirms current doc activity): https://developer.smartthings.com/docs/release-notes (MEDIUM)
- GitHub webhooks creation + best practices + redelivery (official): https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks, https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks, https://docs.github.com/en/webhooks/using-webhooks/automatically-redelivering-failed-deliveries-for-a-github-app-webhook (HIGH)
- Shopify webhooks best practices (official): https://shopify.dev/docs/apps/webhooks/best-practices (HIGH)
- Hook0 multi-tenant webhook architecture (vendor doc): https://documentation.hook0.com/how-to-guides/multi-tenant-architecture/ (LOW)
- Auth0 RBAC fundamentals (official): https://auth0.com/docs/manage-users/access-control/rbac (MEDIUM)

---
*Feature research for: multi-location management, per-location views, RBAC, and location-scoped webhook subscriptions*
*Researched: 2026-04-15*
