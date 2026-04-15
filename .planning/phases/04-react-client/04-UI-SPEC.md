---
phase: 4
slug: react-client
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-15
---

# Phase 4 — UI Design Contract

> Lab prototype: single view to list events and surface new arrivals without full reload. No component library required.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none (functional React + minimal CSS) |
| Icon library | none (optional Unicode bullets only) |
| Font | system-ui stack |

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline gaps |
| sm | 8px | List row padding |
| md | 16px | Card / panel padding |
| lg | 24px | Page margin |
| xl | 32px | Section separation |
| 2xl | 48px | — |
| 3xl | 64px | — |

Exceptions: none

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 12px | 500 | 1.4 |
| Heading | 20px | 600 | 1.3 |
| Display | 24px | 600 | 1.2 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#0f1419` | Page background (dark lab default) |
| Secondary (30%) | `#1a2332` | Event rows / panels |
| Accent (10%) | `#3d8bfd` | New-event highlight / links only |
| Destructive | `#e5534b` | Errors only |

Accent reserved for: new/unread event row highlight, focus ring on refresh control

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Refresh events |
| Empty state heading | No events yet |
| Empty state body | Start the orchestrator and simulator, or trigger an event — activity will show here. |
| Error state | Could not load events. Check the API URL and that the server is running. |
| Destructive confirmation | *(not used in v1 lab)* |

---

## Layout & Screens

| Screen | Purpose |
|--------|---------|
| **Events** | Single column: heading, optional home id label, list of recent events (type, time, summary). “New” badge or accent border when event arrived since last poll. |

**Live updates (UI-02):** Polling every **3–5s** (configurable) acceptable; no full page navigation on new data.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | — | not required |
| npm only | — | pin versions in package.json |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending 2026-04-15
