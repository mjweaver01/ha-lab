# Pitfalls Research

**Domain:** Extending a webhook/event app with location CRUD + location RBAC + location-scoped subscriptions
**Researched:** 2026-04-15
**Confidence:** MEDIUM-HIGH

## Critical Pitfalls

### Pitfall 1: Partial Tenantization (some paths still "global")

**What goes wrong:**
Location data model changes ship, but only some API handlers, SQL queries, and background fan-out jobs apply `location_id` scoping. Users can read or mutate resources in other locations through overlooked routes or internal jobs.

**Why it happens:**
The existing app started single-scope (`home`) and teams retrofit scoping incrementally. A few old code paths (admin endpoints, exports, replay scripts, retry workers) miss the new boundary.

**How to avoid:**
Create an explicit "scope matrix" before coding: every resource x action must declare required scope (`home`, `location`, or `global-admin`). Add server-side authorization middleware that resolves `{user, location, action}` for every request. Add negative tests per endpoint for cross-location access attempts.

**Warning signs:**
Security tests mostly check success paths; few tests assert `403`. Different handlers perform custom auth checks instead of centralized policy evaluation. Logs do not include `location_id` on deny/allow decisions.

**Phase to address:**
Phase 1 (Authorization model and policy matrix), then Phase 2 (endpoint-by-endpoint enforcement rollout).

---

### Pitfall 2: RBAC Role Explosion and Exception Sprawl

**What goes wrong:**
Simple RBAC (`owner`, `member`, `viewer`) cannot express real constraints (e.g., "location admin can manage subscriptions but not billing"). Teams add ad-hoc conditionals in handlers, producing inconsistent behavior and privilege creep.

**Why it happens:**
Retrofitting RBAC into an existing app favors quick role checks over a policy model that includes attributes/relationships (location membership, resource ownership, environment context).

**How to avoid:**
Define permissions as capabilities first (`location.subscription.manage`, `location.user.invite`) and map roles to capabilities per location. Keep role checks in one policy layer, not in controllers. Add a quarterly permission review and migration path to ABAC/ReBAC-like conditions when needed.

**Warning signs:**
Repeated `if role ===` chains across files; new features require adding one-off "except if ..." checks. Support requests to "temporarily grant admin" become common.

**Phase to address:**
Phase 1 (permission taxonomy + policy engine contract) and Phase 5 (policy regression tests and privilege review).

---

### Pitfall 3: Location CRUD Migration Breaks Data Integrity

**What goes wrong:**
Introducing `locations` and new foreign keys causes null/invalid references, orphaned rows, or blocked migrations. Existing records become ambiguously scoped, and fan-out joins return wrong data.

**Why it happens:**
Schema evolution is treated as a table-add only task. Backfill plan, FK behavior (`RESTRICT` vs `CASCADE`), and rollout sequencing are under-specified.

**How to avoid:**
Use expand-migrate-contract:
1) add nullable `location_id` + write-path dual writes,
2) backfill with deterministic mapping,
3) enforce non-null + FK after validation.
Run `PRAGMA foreign_keys=ON` on every connection and validate with pre/post migration integrity checks.

**Warning signs:**
Manual scripts assign default location without provenance; migrations disable constraints "temporarily"; rollback plan is missing.

**Phase to address:**
Phase 0 (data model + migration design) and Phase 2 (cutover + integrity verification).

---

### Pitfall 4: Subscription Scope Drift (Endpoint gets wrong location events)

**What goes wrong:**
Subscriptions are created for a location, but dispatch filtering is inconsistent (publish path uses event type only, retry worker misses location filter, or endpoint edits broaden scope). Result: over-broadcast, noisy alerts, possible data leak.

**Why it happens:**
Subscription schema and event schema evolve separately. Scope is enforced at subscription creation, but not rechecked at dispatch and retry stages.

**How to avoid:**
Store scope as first-class immutable fields on both events and subscriptions (`location_id`, `event_type`, `subscription_id`). Enforce scope match at dispatch and again in retry workers. Add contract tests covering create, update, retry, and replay.

**Warning signs:**
Subscribers report receiving unrelated location events; retries use a generic queue without scope columns; one endpoint URL is shared by many locations without explicit per-location secrets/metadata.

**Phase to address:**
Phase 3 (subscription domain model + dispatch pipeline) and Phase 4 (replay/retry hardening).

---

### Pitfall 5: Assuming Exactly-Once / In-Order Webhook Processing

**What goes wrong:**
Handlers mutate state directly per delivery and assume no duplicates or reordering. Retries and parallel delivery produce duplicate actions, stale overwrites, and hard-to-reconcile timelines.

**Why it happens:**
Webhook semantics are misunderstood during retrofit: existing event flow looked sequential in local tests, so idempotency and ordering guards were postponed.

**How to avoid:**
Treat delivery as at-least-once and potentially out-of-order. Persist delivery identity and dedupe keys (`event_id` and `(event_type, object_id)` where needed). Make handlers idempotent, acknowledge fast (`2xx`), process async, and implement replay-safe state transitions.

**Warning signs:**
Business actions execute inside request thread before ack; no processed-event table with unique constraint; incident timelines show repeated side effects for same event.

**Phase to address:**
Phase 3 (delivery contract), Phase 4 (retry/replay tooling), Phase 5 (chaos tests with duplicate/out-of-order injections).

---

### Pitfall 6: Weak Webhook Trust Boundary (signature and secret hygiene gaps)

**What goes wrong:**
System accepts forged or replayed webhook calls, or fails legitimate calls after body parsing changes. Per-location endpoints share secrets, increasing blast radius during compromise.

**Why it happens:**
Signature verification is bolted on late, often after JSON parsing; secret rotation and timestamp tolerance are not designed with multi-location scope in mind.

**How to avoid:**
Verify signatures against raw body before parsing, enforce timestamp tolerance, and maintain per-endpoint/per-location secrets with rotation runbooks. Reject missing/invalid signatures early and log verification outcomes with location context.

**Warning signs:**
Verification occurs after body mutation; secrets are copied across environments/locations; no documented rotation procedure; replay attempts are not detectable in logs.

**Phase to address:**
Phase 3 (ingress trust model) and Phase 5 (security validation + key rotation drills).

---

### Pitfall 7: Dangerous Delete Semantics for Locations

**What goes wrong:**
Deleting a location cascades unexpectedly (loss of history/subscriptions) or fails due to hidden dependencies, leaving half-deleted state. External subscribers continue receiving stale retries for deleted scopes.

**Why it happens:**
CRUD UX and backend deletion semantics are designed independently. Teams decide "hard delete" vs "archive" late, after dependencies exist.

**How to avoid:**
Choose lifecycle model upfront: soft-delete/archive locations by default, with explicit retention windows and purge jobs. On archive: disable new subscriptions, drain retries, and return deterministic errors for new events in archived scope.

**Warning signs:**
`DELETE /locations/:id` exists without dependency preview; UI offers one-click delete without impact summary; subscription retries continue after archival.

**Phase to address:**
Phase 2 (location CRUD lifecycle rules) and Phase 4 (subscription drain/decommission workflow).

---

### Pitfall 8: Missing Auditability Across Auth + Dispatch

**What goes wrong:**
When "wrong user changed wrong location" or "wrong endpoint got event" incidents occur, there is no forensic trail tying actor, decision, scope, and delivery attempt.

**Why it happens:**
Telemetry is added after features "work." Existing logs focus on HTTP status and not authorization decision facts or dispatch routing facts.

**How to avoid:**
Log structured audit events for: permission evaluation (actor, resource, action, result, reason), subscription matching, delivery attempts, retries, and decommissions. Correlate with event/request IDs and location IDs.

**Warning signs:**
On-call must grep raw logs to reconstruct incidents; deny reasons are absent; cannot answer "which policy allowed this?" within minutes.

**Phase to address:**
Phase 5 (audit/observability baseline) with hooks introduced during Phases 2-4.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reusing old `home_id` checks as proxy for location checks | Fast retrofit with minimal code churn | Silent cross-location leaks where `home` contains many locations | Only during a short-lived branch spike, never merged |
| Storing role strings directly on user records | Simple reads | Cannot represent per-location roles cleanly; expensive migration later | Never for this milestone |
| One shared webhook secret for all locations | Easier setup and ops | Large blast radius on compromise; poor revocation granularity | Never in multi-location mode |
| Hard delete locations immediately | Simpler CRUD semantics | Data loss and orphaned external workflows | Acceptable only for empty test data with explicit guardrails |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Webhook providers (Stripe/Svix-style) | Doing heavy processing before acknowledgment | Return `2xx` quickly, queue internal processing, retry-safe handlers |
| Signature verification libraries | Verifying parsed JSON body instead of raw payload | Capture raw request body and verify signature before parsing |
| Retry/replay operations | Manual replay without dedupe markers | Persist processing state and skip already processing/processed events |
| External subscriber endpoints | Assuming ordered delivery | Design subscriber contract for out-of-order and duplicate deliveries |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 permission checks per event fan-out | Dispatch latency grows with subscribers | Precompute permission context and cache per request with short TTL | Noticeable at tens of subscribers/location |
| Full-table scan on scoped events/subscriptions | Slow list and retry jobs | Add composite indexes (`location_id`, `created_at`, `status`) | Usually at ~100k+ events |
| Synchronous webhook fan-out in request path | Request timeouts and retry storms | Outbox/queue fan-out worker with bounded concurrency | Appears once endpoints are intermittently slow |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-provided `location_id` without membership check | Horizontal privilege escalation (IDOR/BOLA) | Resolve actor scope server-side and validate object-level permission each request |
| RBAC checks only in UI routes | Bypass via direct API calls | Enforce authorization in server middleware/service layer with deny-by-default |
| Missing replay protection for webhook signatures | Replayed valid messages trigger repeated actions | Enforce timestamp tolerance and dedupe via delivery/event IDs |
| Shared secrets across environments/locations | Broader compromise impact | Isolate secrets per endpoint/location and rotate regularly |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Hidden scope context in UI | Users edit wrong location or misread data ownership | Persistent location context badge + confirmation on cross-location actions |
| Permission errors shown as generic failures | Operators cannot self-correct | Explicit "missing permission X in location Y" messaging |
| Subscription forms default to broad scopes | Accidental over-subscription and alert fatigue | Safe defaults: smallest scope first, explicit opt-in for wider scope |
| Destructive location actions without impact preview | Surprise data and webhook behavior changes | Show affected users/subscriptions/events before confirm |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Location CRUD:** Often missing archive semantics - verify delete/archive behavior with existing subscriptions.
- [ ] **RBAC rollout:** Often missing deny tests - verify cross-location `403` coverage for every endpoint.
- [ ] **Webhook scoping:** Often missing retry-path filters - verify retries cannot cross location boundaries.
- [ ] **Signature validation:** Often missing raw-body handling - verify parsed-body mutations cannot bypass checks.
- [ ] **Migration:** Often missing backfill audit - verify every legacy row has deterministic `location_id`.
- [ ] **Observability:** Often missing authz audit trail - verify each decision includes actor, scope, action, result.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cross-location data exposure | HIGH | Freeze affected endpoints, rotate credentials/secrets, run scope-audit queries, notify impacted users, ship policy hotfix and regression tests |
| Duplicate/out-of-order side effects | MEDIUM | Pause consumers, replay from canonical event log with idempotency keys, reconcile state diffs, add unique constraints |
| Broken location migration | HIGH | Roll forward with repair migration, rebuild mapping table from source-of-truth, validate FK integrity, re-run cutover checklist |
| Subscription scope drift | MEDIUM | Disable broad subscriptions, recompute target sets from scoped rules, re-register endpoints with explicit location bindings |

## Pitfall-to-Phase Mapping

How milestone phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Partial tenantization | Phase 1-2 (policy matrix + enforcement rollout) | Failing cross-location tests before change, passing `403` tests after |
| Role explosion and exception sprawl | Phase 1 + Phase 5 | Policy table versioned; permission regression suite passes |
| Migration integrity breakage | Phase 0 + Phase 2 | Backfill completeness report and FK integrity checks all green |
| Subscription scope drift | Phase 3 + Phase 4 | Contract tests for create/update/retry/replay confirm strict location matching |
| Duplicate and out-of-order deliveries | Phase 3-5 | Chaos tests inject duplicate/reordered events with no duplicate side effects |
| Weak signature/secret hygiene | Phase 3 + Phase 5 | Security tests reject invalid/replayed payloads; rotation drill succeeds |
| Dangerous delete semantics | Phase 2 + Phase 4 | Archive/delete UAT includes dependency previews and retry drain behavior |
| Missing auditability | Phase 5 (instrumentation) | Incident drill can trace actor->policy->delivery in minutes |

## Sources

- https://www.sqlite.org/foreignkeys.html (official SQLite foreign key behavior and enforcement requirements)
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html (authorization failure modes and prevention patterns)
- https://docs.stripe.com/webhooks#handle-duplicate-events (duplicate delivery handling)
- https://docs.stripe.com/webhooks#event-ordering (ordering caveats)
- https://docs.stripe.com/webhooks/signatures (raw-body signature verification, replay mitigation)
- https://docs.stripe.com/webhooks/process-undelivered-events (manual replay and dedupe workflow)
- https://docs.svix.com/receiving/verifying-payloads/how (provider-agnostic webhook verification implementation guidance)
- https://www.svix.com/blog/guaranteeing-webhook-ordering/ (practical limits of strict webhook ordering)

---
*Pitfalls research for: multi-location authorization and location-scoped webhook subscriptions in an existing home-assist event app*
*Researched: 2026-04-15*
