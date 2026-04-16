# Phase 9: log-analytics-and-capacitor-foundation - Context

**Gathered:** 2026-04-16  
**Status:** Ready for execution planning

<domain>
## Phase Boundary

Deliver two outcomes in one phase:
1) Recharts analytics for log/event trends in the existing Events UI.
2) Capacitor runtime setup so the app can run in iOS/Android shells.

</domain>

<decisions>
## Implementation Decisions

- **D-01:** Use `recharts` for analytics visualizations (line/area/bar) rather than custom SVG charting.
- **D-02:** Keep analytics data server-aggregated (`/events/analytics`) so client charts consume compact payloads.
- **D-03:** Preserve existing events list polling and controls; analytics is additive, not a replacement.
- **D-04:** Use Capacitor official packages (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`) with script-driven sync flow.
- **D-05:** Commit mobile workflow commands and prerequisites to `README.md` to make setup reproducible.
- **D-06:** Analytics scope follows the current events context: all-events view queries global aggregates, location-events view applies that location scope.
- **D-07:** Capacitor app display name is `Home Assistant Lab`.
- **D-08:** Do not introduce a separate analytics page/route; charts render inline on the existing `Events` page.

### Claude's Discretion
- Exact chart composition/layout as long as it remains readable and responsive with current `ui-*` primitives.
- Final Capacitor app id namespace (reverse-domain string) as long as it stays stable and documented.

</decisions>

<assumptions>
## Assumptions

- Existing event payloads contain enough signal (`event_type`, timestamp, optional confidence-like field) for useful trend charts.
- Mobile development machine has or can install Xcode and Android Studio.
- Static web asset build can be produced from current Bun+React setup without migrating to Vite.

</assumptions>

<open_questions>
## Open Questions

1. Should mobile app ID use `lab.homeassist.app` or another reverse-domain namespace?
2. Is location-detail visibility work (previous roadmap Phase 9 scope) intentionally deferred to backlog after this phase?

</open_questions>
