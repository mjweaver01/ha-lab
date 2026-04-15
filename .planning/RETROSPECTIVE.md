# Retrospective — Home Assist Lab

Living document; append a section per milestone.

---

## Milestone: v1.0 — learning prototype

**Shipped:** 2026-04-15  
**Phases:** 4 | **Plans:** 7 | **Tasks:** ~18 (from SUMMARY rollups)

### What was built

- SQLite schema + migrations + home/user helpers (`HOME-01`, `HOME-02`).
- Bun orchestrator: `POST/GET /events`, `POST /subscribers`, fan-out + `event_deliveries` (`HOOK-01`–`HOOK-04`).
- Simulated node CLI (`bun run simulate`) with sample event types (`NODE-01`).
- React Events UI with polling and new-row highlight (`UI-01`, `UI-02`).

### What worked

- **GSD phase plans** with SUMMARYs gave a clear trace from requirements to code.
- **Bun + SQLite** kept the lab fast to run and test (`bun test` as single gate).
- **Integration tests** for the orchestrator reduced regressions in fan-out and HTTP.

### What was inefficient

- **REQUIREMENTS.md checkboxes** lagged Phase 1 (HOME-01/02) until milestone close — fixed at archive time.
- **`gsd-tools audit-open`** hit a tooling error (`output is not defined`); pre-close audit should be re-run after a fix.

### Patterns established

- **Literal `process.env.PUBLIC_*`** for Bun HTML client env.
- **Selective fetch mock** in tests for subscriber callbacks.

### Key lessons

- **Close the requirements file** when closing the milestone so the archive matches reality.
- **Manual milestone UAT** (`.planning/milestone-v1-UAT.md`) can outlive the ship; track in STATE **Deferred Items** or finish in a follow-up.

### Cost observations

- Not measured in-repo; optional session reports from `/gsd-session-report` if you use them.

---

## Cross‑milestone trends

| Theme | v1.0 |
|-------|------|
| Test coverage vs manual UAT | Strong automated tests; manual UAT incomplete |
| Planning doc drift | Minor: REQ checkboxes, STATE body vs frontmatter |
