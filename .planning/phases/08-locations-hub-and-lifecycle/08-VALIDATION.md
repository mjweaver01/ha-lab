---
phase: 08
slug: locations-hub-and-lifecycle
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test + @testing-library/react + happy-dom |
| **Config file** | `bunfig.toml` |
| **Quick run command** | `bun test src/db/migrate.test.ts src/client/events-screen.test.tsx` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted tests for touched area (route/UI) plus quick run command when behavior changes are broad.
- **After every plan wave:** Run `bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | LOC-01 | T-08-01 | List endpoint returns only scoped active locations by default | integration | `bun test src/routes/locations.test.ts -t "default active list"` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | LOC-02 | T-08-02 | Create validates input and persists allowed fields only | integration | `bun test src/routes/locations.test.ts -t "create location"` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | LOC-03 | T-08-03 | Edit checks scope/role contract and updates safe fields | integration | `bun test src/routes/locations.test.ts -t "edit location"` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | LOC-04 | T-08-04 | Archive is soft only (`archived_at`) and supports restore | integration | `bun test src/routes/locations.test.ts -t "archive location"` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | LOC-05 | T-08-05 | Active default excludes archived; include-archived reveals auditable rows | integration + UI | `bun test src/routes/locations.test.ts src/client/locations-screen.test.tsx -t "include archived"` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | VIEW-01 | T-08-06 | Hub row/open action navigates to location detail shell | UI | `bun test src/client/main.locations-nav.test.tsx -t "open location detail"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/routes/locations.test.ts` — stubs and core endpoint contract tests for LOC-01..LOC-05
- [ ] `src/client/locations-screen.test.tsx` — hub rendering/filter/archive UI tests
- [ ] `src/client/main.locations-nav.test.tsx` — hub-to-detail navigation tests for VIEW-01
- [ ] Shared seeded fixture helpers for users/locations/memberships in test DB setup

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end operator pass through hub lifecycle | LOC-01..LOC-05 | Complements automated checks with UX/state continuity validation across multiple actions | Start app + API, create location, edit metadata, archive, toggle include-archived, restore, confirm expected row presence throughout |
| Hub to detail interaction sanity | VIEW-01 | Confirms visual click target and transition affordance quality | From hub list, use both row click and explicit Open action, verify detail shell loads expected location |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
