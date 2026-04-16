# Roadmap: Home Assist Lab

**Current milestone:** v1.2 Location management + location-scoped access/events  
**Created:** 2026-04-15

## Milestones

- ✅ **[v1.0 learning prototype](milestones/v1.0-ROADMAP.md)** — Phases 1–4. Shipped 2026-04-15.
- ✅ **v1.1 Local media events** — Phases 5–7. Complete.
- 🚧 **v1.2 Location management + location-scoped access/events** — Phases 8–12. Planned.

## Overview

v1.2 introduces location-first operations across the app so users can manage locations, view location-scoped devices and memberships, enforce role-based access, and run location-scoped webhook subscriptions with delivery visibility and recovery controls.

## Phases

**Phase numbering:** Continue after v1.1 with phases 8–12. Decimal phases (for example 8.1) are reserved for urgent insertions.

- [ ] **Phase 8: Locations hub and lifecycle** - Users can list, create, edit, archive, and navigate locations.
- [ ] **Phase 9: Location detail visibility** - Users can open a location and view scoped devices and memberships.
- [ ] **Phase 10: Location RBAC and delegated access** - Location permissions are enforced and manageable per user and role.
- [ ] **Phase 11: Location subscription administration** - Admins can configure location-scoped webhook subscriptions.
- [ ] **Phase 12: Scoped delivery reliability** - Delivery execution and operability remain isolated by location.

## Phase Details

### Phase 8: Locations hub and lifecycle
**Goal**: Users can manage the full location lifecycle and navigate from a unified locations hub into specific locations.
**Depends on**: Phase 7
**Requirements**: LOC-01, LOC-02, LOC-03, LOC-04, LOC-05, VIEW-01
**Success Criteria** (what must be TRUE):
  1. User can open a locations hub showing all active locations they can access.
  2. User can create and edit a location with required metadata and see changes reflected in the hub.
  3. User can archive a location, and archived locations are removed from default active views while still available for audit history.
  4. User can navigate from the locations hub into a specific location detail page.
**Plans**: TBD
**UI hint**: yes

### Phase 9: Location detail visibility
**Goal**: Users can inspect location-specific devices and user memberships from the selected location view.
**Depends on**: Phase 8
**Requirements**: VIEW-02, VIEW-03
**Success Criteria** (what must be TRUE):
  1. User can view all devices associated with the selected location.
  2. User can view all users and memberships associated with the selected location.
  3. Switching to a different location updates the displayed devices and memberships to the new location scope.
**Plans**: TBD
**UI hint**: yes

### Phase 10: Location RBAC and delegated access
**Goal**: Access to location data and actions is controlled by server-enforced role policies, with clear admin tooling for membership and delegated roles.
**Depends on**: Phase 9
**Requirements**: VIEW-04, RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05, RBAC-06, PERM-01, PERM-02, DELEG-01, DELEG-02, DELEG-03
**Success Criteria** (what must be TRUE):
  1. Admin can assign, update, and remove a user's role for a specific location.
  2. Unauthorized users cannot read or mutate location-scoped data and receive clear access-denied responses that do not leak protected data.
  3. UI hides or disables unauthorized actions while server-side policy remains the source of truth.
  4. Admin can preview effective permissions for a selected user in a selected location, and the preview matches actual policy behavior.
  5. Admin can grant temporary delegated roles with expiration, and expired delegations are automatically inactive.
**Plans**: TBD
**UI hint**: yes

### Phase 11: Location subscription administration
**Goal**: Admins can create and manage webhook subscriptions scoped to a specific location and configured event filters.
**Depends on**: Phase 10
**Requirements**: SUB-01, SUB-02, SUB-03, SUB-05
**Success Criteria** (what must be TRUE):
  1. Admin can create a webhook subscription for a selected location.
  2. Admin can edit subscription settings and event selection/filter rules for that location.
  3. Admin can enable or disable a location subscription without deleting it.
**Plans**: TBD
**UI hint**: yes

### Phase 12: Scoped delivery reliability
**Goal**: Location events route only to matching subscriptions, and admins can observe and recover subscription delivery failures.
**Depends on**: Phase 11
**Requirements**: SUB-04, REL-01, REL-02, REL-03, REL-04
**Success Criteria** (what must be TRUE):
  1. Events are delivered only to subscriptions with the same location scope.
  2. User can view each location subscription's last delivery status plus last success/failure timestamps and details.
  3. Admin can trigger a test delivery for a location subscription and inspect the outcome.
  4. Admin can manually redeliver eligible failed deliveries from the location subscription context.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1-4. v1.0 learning prototype | 7/7 | Complete | 2026-04-15 |
| 5. Local media capture | 2/2 | Complete | 2026-04-15 |
| 6. Media signals -> events | 3/3 | Complete | 2026-04-15 |
| 7. E2E media trace | 1/1 | Complete | 2026-04-15 |
| 8. Locations hub and lifecycle | 0/TBD | Not started | - |
| 9. Location detail visibility | 0/TBD | Not started | - |
| 10. Location RBAC and delegated access | 0/TBD | Not started | - |
| 11. Location subscription administration | 0/TBD | Not started | - |
| 12. Scoped delivery reliability | 0/TBD | Not started | - |
