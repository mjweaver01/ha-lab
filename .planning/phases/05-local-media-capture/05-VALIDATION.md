---
phase: 5
slug: local-media-capture
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
---

# Phase 5 — Validation Strategy

> Feedback sampling for local media capture (client-only).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test |
| **Config file** | `package.json` `test` script |
| **Quick run command** | `bun test` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~5–15 seconds |

---

## Sampling Rate

- **After every task commit:** `bun test`
- **After every plan wave:** `bun test`
- **Before `/gsd-verify-work`:** Full suite green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | MEDIA-01, MEDIA-02 | T-1 | No sensitive media in logs | unit | `bun test src/client/lib/media-errors.test.ts` | ⬜ pending | ⬜ pending |
| 05-01-02 | 01 | 1 | MEDIA-01, MEDIA-02 | T-1 | N/A | unit | `bun test src/client/hooks/use-media-capture.test.ts` | ⬜ pending | ⬜ pending |
| 05-02-01 | 02 | 2 | MEDIA-01, MEDIA-02 | T-1 | `role="alert"` on errors | unit | `bun test src/client/media-capture-section.test.tsx` | ⬜ pending | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing `bun test` + happy-dom cover client tests — no new global framework.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Permission deny / dismiss | MEDIA-01, MEDIA-02 | Browser OS dialog | Open Events page → Start microphone → Deny → assert inline alert matches UI-SPEC (device + remediation). Repeat for camera. |
| Revoke while active | MEDIA-01, MEDIA-02 | OS settings | Start mic → macOS System Settings → Privacy → Microphone → revoke browser → UI must show non-silent error. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or manual table above
- [ ] Sampling continuity maintained
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set in frontmatter when verified

**Approval:** pending
