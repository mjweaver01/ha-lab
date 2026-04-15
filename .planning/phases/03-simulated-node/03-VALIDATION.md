---
phase: 3
slug: simulated-node
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 3 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (+ manual smoke with Phase 2 running) |
| **Config file** | none |
| **Quick run command** | `bun test` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~10 seconds |

## Sampling Rate

- **After every task commit:** `bun test`
- **After every plan wave:** `bun test`

## Wave 0 Requirements

- [ ] Unit tests for URL normalization / payload builders; smoke path documented in RESEARCH

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Events visible in Phase 2 after script run | NODE-01 | Needs orchestrator up | `bun run` simulator then query GET /events or logs |

## Validation Sign-Off

**Approval:** pending
