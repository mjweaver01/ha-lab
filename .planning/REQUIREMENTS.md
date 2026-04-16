# Requirements: Home Assistant Lab

**Defined:** 2026-04-15  
**Milestone:** v1.2 Location management + location-scoped access/events  
**Core value:** End-to-end trace one event from node → orchestrator → subscribed user alert.

## v1.2 Requirements

Requirements for this milestone. Each maps to roadmap phases (starting at phase **8**).

### Locations

- [x] **LOC-01**: User can view a unified list of all locations they can access.
- [x] **LOC-02**: User can create a new location with required metadata.
- [x] **LOC-03**: User can edit location details for locations they administer.
- [x] **LOC-04**: User can archive a location instead of hard-deleting it.
- [x] **LOC-05**: Archived locations are excluded from default active views while remaining auditable.

### Location views (devices + users)

- [x] **VIEW-01**: User can open a location detail page from the locations hub.
- [ ] **VIEW-02**: User can view all devices scoped to that location.
- [ ] **VIEW-03**: User can view all users and memberships scoped to that location.
- [ ] **VIEW-04**: User cannot view device or user data for a location they are not authorized to access.

### Log analytics visualization

- [ ] **LOG-01**: User can view event-volume trend charts for selected time range and bucket granularity inline on the existing Events page across both global and selected-location contexts.
- [ ] **LOG-02**: User can view event-type distribution inline on the existing Events page for the active auto-applied scope.
- [ ] **LOG-03**: User can view confidence trend analytics for detection events when confidence data exists.
- [ ] **LOG-04**: Analytics panel uses server-provided aggregate data and updates without full page reload.
- [ ] **LOG-05**: Analytics panel preserves existing events list usability and does not block polling.

### Capacitor mobile runtime

- [ ] **CAP-01**: Project includes Capacitor core configuration targeting the existing web bundle output.
- [ ] **CAP-02**: iOS and Android platform projects can be generated and synced from the current web app.
- [ ] **CAP-03**: App can launch in Capacitor shell with existing routes/events UI functional in native WebView.
- [ ] **CAP-04**: Build/sync/run scripts are documented and runnable for repeatable mobile dev workflow.

### Membership + RBAC

- [ ] **RBAC-01**: Admin can assign a predefined role to a user for a specific location.
- [ ] **RBAC-02**: Admin can update a user's role for a specific location.
- [ ] **RBAC-03**: Admin can remove a user's location membership.
- [ ] **RBAC-04**: API enforces location-scoped permissions server-side for all location reads and writes.
- [ ] **RBAC-05**: Unauthorized operations return clear access-denied responses without leaking scoped data.
- [ ] **RBAC-06**: UI reflects permissions by hiding or disabling unavailable actions while server policy remains source of truth.

### Location-scoped webhook subscriptions

- [ ] **SUB-01**: Admin can create a webhook subscription scoped to a specific location.
- [ ] **SUB-02**: Admin can edit a location webhook subscription.
- [ ] **SUB-03**: Admin can enable or disable a location webhook subscription.
- [ ] **SUB-04**: Events are delivered only to subscriptions for the matching location.
- [ ] **SUB-05**: Subscription configuration supports event selection or filtering per location.

### Delivery visibility + reliability controls

- [ ] **REL-01**: User can view last delivery status for each location subscription.
- [ ] **REL-02**: User can view last success and last failure timestamps and details per subscription.
- [ ] **REL-03**: Admin can trigger a test delivery for a location subscription.
- [ ] **REL-04**: Admin can trigger manual redelivery for eligible failed deliveries.

### Effective permissions preview

- [ ] **PERM-01**: Admin can view an effective permissions summary for a selected user in a selected location.
- [ ] **PERM-02**: Permissions preview reflects actual server policy evaluation for that user and location.

### Delegated roles with expiry

- [ ] **DELEG-01**: Admin can grant a temporary delegated role for a specific location.
- [ ] **DELEG-02**: Delegated role includes an explicit expiration time.
- [ ] **DELEG-03**: Expired delegated roles are automatically treated as inactive by policy enforcement.

## Future requirements (deferred)

Not in v1.2 roadmap; tracked for later versions.

### Possible later

- Subscription templates across many locations.
- Cross-location aggregate operations dashboards.
- Per-user custom action-by-action permission toggles.

## Out of scope

| Feature | Reason |
|---------|--------|
| Hard-deleting locations by default | Archive-first preserves referential integrity and auditability |
| Global webhook stream mixing all locations | Violates location isolation and increases leakage risk |
| External policy engines or OAuth provider rollout in v1.2 | Adds system complexity beyond milestone scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOC-01 | 8 | Complete |
| LOC-02 | 8 | Complete |
| LOC-03 | 8 | Complete |
| LOC-04 | 8 | Complete |
| LOC-05 | 8 | Complete |
| VIEW-01 | 8 | Complete |
| VIEW-02 | Backlog | Pending |
| VIEW-03 | Backlog | Pending |
| VIEW-04 | 10 | Pending |
| LOG-01 | 9 | Pending |
| LOG-02 | 9 | Pending |
| LOG-03 | 9 | Pending |
| LOG-04 | 9 | Pending |
| LOG-05 | 9 | Pending |
| CAP-01 | 9 | Pending |
| CAP-02 | 9 | Pending |
| CAP-03 | 9 | Pending |
| CAP-04 | 9 | Pending |
| RBAC-01 | 10 | Pending |
| RBAC-02 | 10 | Pending |
| RBAC-03 | 10 | Pending |
| RBAC-04 | 10 | Pending |
| RBAC-05 | 10 | Pending |
| RBAC-06 | 10 | Pending |
| SUB-01 | 11 | Pending |
| SUB-02 | 11 | Pending |
| SUB-03 | 11 | Pending |
| SUB-04 | 12 | Pending |
| SUB-05 | 11 | Pending |
| REL-01 | 12 | Pending |
| REL-02 | 12 | Pending |
| REL-03 | 12 | Pending |
| REL-04 | 12 | Pending |
| PERM-01 | 10 | Pending |
| PERM-02 | 10 | Pending |
| DELEG-01 | 10 | Pending |
| DELEG-02 | 10 | Pending |
| DELEG-03 | 10 | Pending |

**Coverage:**

- v1.2 requirements: **38** total  
- Mapped to phases: **36** / 38  
- Unmapped: **2** (`VIEW-02`, `VIEW-03` moved to backlog for later scheduling)  

---

*v1.0 requirements snapshot:* [`milestones/v1.0-REQUIREMENTS.md`](milestones/v1.0-REQUIREMENTS.md)

---
*Requirements defined: 2026-04-15 (milestone v1.2)*
