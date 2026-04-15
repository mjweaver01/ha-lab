# Phase 5: Local media capture - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `05-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 5 — Local media capture
**Areas discussed:** Placement, Control model, Running state & preview, Permission messaging

---

## Placement on the Events screen

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Persistent section below title/meta, above toolbar | |
| 2 | Same row as Refresh (left controls, right refresh) | |
| 3 | Collapsible **Media** header that expands to show controls | ✓ |

**User's choice:** 3 (collapsible)
**Notes:** Keeps the Events page compact while keeping controls behind a clear label.

---

## Mic vs camera control model

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Independent toggles for microphone and camera | ✓ |
| 2 | Single Start/Stop for both devices together | |

**User's choice:** 1 (independent toggles)

---

## Running state and preview

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Status text only (no preview, no meter) | |
| 2 | Status + small live camera preview; mic text only | |
| 3 | Status + camera preview + **mic level meter** when mic on | ✓ |

**User's choice:** 3 (full: status + preview + meter)

---

## Permission / error messaging

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Custom inline alert (same family as existing errors) + short remediation hint | ✓ |
| 2 | Minimal one-line error, no remediation | |

**User's choice:** 1 (custom alert + hints)

---

## Claude's Discretion

- Default expanded/collapsed for collapsible section; meter implementation details; preview sizing; exact labels.

## Deferred Ideas

- Media → POST /events (Phase 6); E2E Events list trace (Phase 7).
