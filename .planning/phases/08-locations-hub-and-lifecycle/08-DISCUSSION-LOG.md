# Phase 8: locations-hub-and-lifecycle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15T00:00:00Z
**Phase:** 08-locations-hub-and-lifecycle
**Areas discussed:** Hub layout and navigation, Location lifecycle and archive behavior, Create/edit workflow, Location metadata contract, Access filtering baseline

---

## Hub layout and navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Table-style hub | Highest scan efficiency for operational/admin workflows; aligns with future growth in location count. | ✓ |
| Card grid hub | More visual but less dense for management-heavy tasks. | |
| Hybrid cards + table toggle | Flexible but adds implementation and UX complexity in phase 8. | |

**User's choice:** Proceed with best practices and established conventions (interpreted as recommended default: table-style management hub).
**Notes:** Keep navigation into location detail explicit and fast from each row.

---

## Location lifecycle and archive behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Soft archive with default active-only list | Preserves auditability while keeping day-to-day list clean. | ✓ |
| Hard delete | Simpler but conflicts with archive-first requirement and audit safety. | |
| Active + archived mixed by default | Lower implementation effort, poorer operational clarity. | |

**User's choice:** Proceed with best-practice conventions (recommended default selected).
**Notes:** Include archive visibility controls without making archived records the default.

---

## Create/edit workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Shared form model in dedicated create/edit surface | Reusable validation and scalable for later phase expansion. | ✓ |
| Inline row editing in hub | Fast edits but weak for richer metadata and future role-bound workflows. | |
| Modal-only flow | Useful for quick edits but often cramped for growing form scope. | |

**User's choice:** Proceed with best-practice conventions (recommended default selected).
**Notes:** Keep create/edit behavior consistent and resilient to API validation errors.

---

## Location metadata contract

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal required + structured optional metadata | Avoids over-modeling now while keeping future-proof extension points. | ✓ |
| Many required fields immediately | Strong upfront structure but high friction and likely churn. | |
| Name-only no optional structure | Fast now but creates avoidable migration churn in follow-up phases. | |

**User's choice:** Proceed with best-practice conventions (recommended default selected).
**Notes:** Start strict on required name, leave optional fields intentionally extensible.

---

## Access filtering baseline

| Option | Description | Selected |
|--------|-------------|----------|
| Access-scoped queries now (pre-RBAC hardening) | Prevents later rework and data leakage risk. | ✓ |
| Open visibility now, lock down in phase 10 | Faster early build but high regression and leakage risk. | |
| Partial masking in UI only | Insufficient because server policy must remain source of truth. | |

**User's choice:** Proceed with best-practice conventions (recommended default selected).
**Notes:** Even before full role tooling, API boundaries must be non-leaky and scope-aware.

---

## Claude's Discretion

- UI microcopy and visual polish details within current design conventions.
- Exact navigation path format and low-level state plumbing details.
- Optional metadata label naming and display ordering.

## Deferred Ideas

None.
