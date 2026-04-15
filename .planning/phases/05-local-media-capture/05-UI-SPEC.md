---
phase: 5
slug: local-media-capture
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-15
---

# Phase 5 — UI Design Contract

> Visual and interaction contract for local microphone and camera capture on the Events screen. Aligns with existing v1.0 tokens in `src/client/styles.css` (see prior phase comment `/* Tokens from 04-UI-SPEC.md */`).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (hand-rolled CSS) |
| Preset | not applicable |
| Component library | none |
| Icon library | none (text labels and status strings; no icon-only primary actions) |
| Font | system-ui stack (inherited from `body`) |

---

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline gaps, meter bar padding |
| sm | 8px | Compact control spacing, border radius |
| md | 16px | Panel padding, section gaps |
| lg | 24px | Page padding |
| xl | 32px | Major section gaps |
| 2xl | 48px | (reserved) |
| 3xl | 64px | (reserved) |

Exceptions: none — new media UI uses only `--space-*` tokens already in `:root`.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px (`--font-body`) | 400–500 | 1.5 (`--line-body`) |
| Label | 12px (`--font-label`) | 500 | 1.4 |
| Heading | 20px (`--font-heading`) | 600 | 1.3 (`--line-heading`) |
| Display | — | — | not used in this phase |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#0f1419` (`--color-dominant`) | Page background |
| Secondary (30%) | `#1a2332` (`--color-secondary`) | Panels (`events-panel` pattern) |
| Accent (10%) | `#3d8bfd` (`--color-accent`) | Focus rings, hover border on **primary** toolbar-style buttons (`events-btn`), **not** every control |
| Destructive | `#e5534b` (`--color-destructive`) | Error borders and emphasis for permission/capture failures |

Accent reserved for: primary **Refresh events** button hover/focus, **Start** capture buttons on hover/focus, focus-visible outlines on interactive controls. Secondary/outline controls use neutral `#30363d` borders unless in error state.

---

## Layout and visual hierarchy

| Element | Role |
|---------|------|
| **Events** title + meta | Primary focal point — unchanged |
| **Media capture** collapsible | Secondary — discoverable header; expanded content shows controls and status |
| **Events list** | Primary content area below toolbar + media |

Collapsed state: user must see a **clear labeled header** (e.g. “Media capture”) with a **visible expand/collapse affordance** (native `<details>`/`<summary>` or button with `aria-expanded`).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Section header | `Media capture` |
| Expand summary (if using details) | `Media capture` (same as header; `summary` is the visible label) |
| Mic idle — primary action | `Start microphone` |
| Mic active — primary action | `Stop microphone` |
| Camera idle — primary action | `Start camera` |
| Camera active — primary action | `Stop camera` |
| Mic status (active) | `Microphone on` (plus level meter; no separate title for meter) |
| Mic status (inactive) | `Microphone off` |
| Camera status (active) | `Camera on` |
| Camera status (inactive) | `Camera off` |
| Generic permission / capture error (`NotAllowedError` / dismissed / denied) | First sentence names the device: `Microphone access was blocked` or `Camera access was blocked`. Second sentence: `Allow access in your browser’s site settings, or in System Settings → Privacy & Security → Microphone (or Camera) on macOS.` |
| Device missing / hardware error (`NotFoundError` or similar) | `No microphone was found` / `No camera was found` as applicable, plus one line: `Check that a device is connected and not in use by another app.` |
| Revoked / track ended while active | Same family as permission error — must not fail silently; show `Microphone` or `Camera` + `was turned off or access was revoked` + remediation hint |

---

## Component behaviors

| Control | Behavior |
|---------|----------|
| Mic start/stop | Independent of camera; stopping releases mic tracks and tears down audio analysis nodes |
| Camera start/stop | Independent of mic; stopping releases video tracks; `<video>` element hidden or placeholder when off |
| Live preview | `<video>` plays `srcObject` from camera track; `muted` + `playsInline` + `autoPlay` for Safari; max height **192px**, width **100%** of panel, `object-fit: cover`, rounded corners using `--space-sm` |
| Level meter | Horizontal bar or strip **min 120px wide**, **8px** height, fill reflects RMS or peak from `AnalyserNode`; when mic off, meter **hidden** or **zero** state clearly “off” |

---

## Accessibility

| Requirement | Detail |
|-------------|--------|
| Errors | `role="alert"` on inline error panel (same pattern as `events-error`) |
| Collapsible | If not native `<details>`, use `aria-expanded` + `aria-controls` linking header to panel id |
| Video | `aria-label="Camera preview"` on `<video>` when camera active |
| Buttons | Visible text on all capture buttons (no icon-only) |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| Third-party | none | not applicable |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-15
