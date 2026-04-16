# Phase 8: locations-hub-and-lifecycle - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

> Note: this context file contains legacy pre-cutover references to `home` tables from the original baseline. Current canonical runtime naming is `location` / `location_id`.

<domain>
## Phase Boundary

Deliver a unified locations hub where users can view active locations they can access, create and edit location records, archive locations (without hard delete), and navigate from the hub into a selected location detail view.

</domain>

<decisions>
## Implementation Decisions

### Hub layout and navigation
- **D-01:** Implement the locations hub as a dense, sortable table-style list optimized for admin workflows (name, status, updated timestamp, key metadata, actions) rather than card-heavy presentation.
- **D-02:** Make row click and explicit "Open" action both navigate into location detail, with consistent empty/loading/error states matching existing app panel conventions.

### Location lifecycle and archive behavior
- **D-03:** Use soft-archive semantics (`archived_at` + optional archive metadata) and never hard-delete in this phase.
- **D-04:** Default hub view shows only active locations; provide an "Include archived" filter/toggle for audit visibility.
- **D-05:** Support archive and restore actions from the hub so lifecycle management stays centralized.

### Create/edit workflow
- **D-06:** Use one shared location form model for both create and edit to keep validation and field behavior consistent.
- **D-07:** Run create/edit in a dedicated detail/edit surface (not inline row editing) so future phase 9/10 expansion can reuse the same structure.
- **D-08:** Validate required fields client-side and server-side, and present inline field errors plus request-level failure feedback.

### Location metadata contract
- **D-09:** Require `name` as the only strict required field in phase 8; keep additional metadata optional but structured for future expansion.
- **D-10:** Include baseline optional metadata fields now (`code/slug`, notes/description) so list/detail UX has stable anchors without over-committing to full domain modeling.

### Access filtering baseline
- **D-11:** Hub queries must be scoped to "locations user can access" from the start, even before full RBAC tooling arrives in phase 10.
- **D-12:** Return access-denied responses as explicit, non-leaky errors and avoid exposing inaccessible location identifiers in list/detail payloads.

### Claude's Discretion
- Exact visual styling tokens, spacing, and iconography as long as they follow existing `events-*`/panel conventions.
- Specific URL shape for navigation state (`path` vs query parameter) as long as deep-link behavior remains stable for location detail.
- Precise naming for optional metadata columns as long as create/edit/list remain internally consistent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase requirements
- `.planning/ROADMAP.md` — Phase 8 goal, scope boundary, dependencies, and success criteria.
- `.planning/REQUIREMENTS.md` — LOC-01..LOC-05 and VIEW-01 requirement contracts for this phase.
- `.planning/PROJECT.md` — milestone framing, architecture constraints, and stack conventions.

### Existing implementation anchors
- `src/client/main.tsx` — current screen-switch pattern and app-level state handoff.
- `src/client/events-screen.tsx` — existing panel/list/filter/pagination interaction patterns to mirror for the locations hub.
- `src/server.ts` — route wiring and request handling conventions for adding location endpoints.
- `src/routes/events.ts` — validation/error response patterns for API handlers.
- `src/db/migrations/001_initial.sql` — legacy baseline before location unification.
- `src/db/migrations/004_home_to_location_unification.sql` — canonical migration that converts event/subscriber scope to `location_id`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/client/events-screen.tsx`: established "panel + controls + list + empty/error states" UI pattern suitable for locations hub composition.
- `src/client/main.tsx`: route-driven app shell using React Router for events, locations, and settings flows.
- `src/db/locations.ts`: DB helper style for location lifecycle operations.

### Established Patterns
- Route handlers validate inputs and return structured JSON errors (`src/routes/events.ts`) with explicit status codes.
- SQLite migrations evolve schema via numbered SQL files in `src/db/migrations/`.
- Client favors explicit local state and typed helpers over heavy framework abstractions.

### Integration Points
- Add location lifecycle endpoints through `src/server.ts` route wiring and new `src/routes/*` handlers.
- Extend DB schema from canonical `locations` toward richer location lifecycle metadata and access-scoped queries.
- Add locations hub/detail surfaces under `src/client/` and connect to API helpers under `src/client/api/`.

</code_context>

<specifics>
## Specific Ideas

- User direction: proceed using best practices and established project conventions without additional interactive discuss prompts.
- Keep implementation choices oriented toward maintainability for downstream phases 9 (detail visibility) and 10 (RBAC/delegation).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-locations-hub-and-lifecycle*
*Context gathered: 2026-04-15*
