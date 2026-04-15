---
phase: 06
slug: media-signals-events
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 06 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test |
| **Config file** | none - Bun defaults |
| **Quick run command** | `bun test src/client/lib/media-signals-*.test.ts` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test src/client/lib/media-signals-*.test.ts`
- **After every plan wave:** Run `bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | MEDIA-03 | T-06-01 | Audio events are throttled and JSON-safe before POST | unit | `bun test src/client/lib/media-signals-audio.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | MEDIA-04 | T-06-01 | Video events are throttled and JSON-safe before POST | unit | `bun test src/client/lib/media-signals-video.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | MEDIA-03, MEDIA-04 | T-06-02 | POST contract + CORS behavior are verified end-to-end | integration | `bun test src/client/api/events-client.post.test.ts src/orchestrator.integration.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/client/lib/media-signals-audio.test.ts` - stubs for MEDIA-03 throttle + payload mapping
- [ ] `src/client/lib/media-signals-video.test.ts` - stubs for MEDIA-04 sampling + payload mapping
- [ ] `src/client/api/events-client.post.test.ts` - POST method/body/error handling checks
- [ ] Orchestrator CORS route assertion for OPTIONS and POST behavior

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live mic/camera sustained activity does not flood events | MEDIA-03, MEDIA-04 | Requires real browser media device behavior | Run app and simulated node, keep mic/camera active for >30s, verify event cadence respects 3s/4s minimum intervals |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
