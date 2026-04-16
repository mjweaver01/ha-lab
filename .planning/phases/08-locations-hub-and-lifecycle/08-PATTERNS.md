# Phase 8: Locations hub and lifecycle - Pattern Map

**Mapped:** 2026-04-16
**Files analyzed:** 14
**Analogs found:** 13 / 14

> Note: this mapping was generated before the location unification cutover and includes legacy `home` examples in quoted snippets. Treat `location` / `location_id` as canonical for current implementation.

> 2026-04-16 update: base UI styling has been normalized to shared `ui-*` primitives. Any `events-*` class references in historical snippets are superseded by:
> - `events-page*` -> `ui-page*`
> - `events-panel` -> `ui-panel`
> - `events-btn` -> `ui-btn`
> - `events-error` -> `ui-alert ui-alert--error`
> - `events-empty*` -> `ui-empty*`
> - `events-loading` -> `ui-loading`
> - `events-filter*` -> `ui-filter*`
> - `events-list*` / `events-row*` -> `ui-list*` / `ui-list-row*`
> - `locations-table` / `locations-row*` / `locations-actions` -> `ui-table` / `ui-table-row*` / `ui-inline-actions`

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/client/locations-screen.tsx` | component | request-response | `src/client/events-screen.tsx` | exact |
| `src/client/location-detail-screen.tsx` | component | request-response | `src/client/media-settings-page.tsx` | role-match |
| `src/client/api/locations-client.ts` | service | request-response | `src/client/api/events-client.ts` | exact |
| `src/client/lib/location-form.ts` | utility | transform | `src/client/lib/media-settings.ts` | role-match |
| `src/routes/locations.ts` | route | request-response | `src/routes/events.ts` | exact |
| `src/db/locations.ts` | service | CRUD | `src/db/homes.ts` | exact |
| `src/db/migrations/003_locations_lifecycle.sql` | migration | CRUD | `src/db/migrations/002_events_subscribers.sql` | exact |
| `src/types/locations-api.ts` | model | transform | `src/types/events-api.ts` | exact |
| `src/client/main.tsx` (modify) | component | event-driven | `src/client/main.tsx` | exact |
| `src/server.ts` (modify) | route | request-response | `src/server.ts` | exact |
| `src/routes/locations.test.ts` | test | request-response | `src/orchestrator.integration.test.ts` | role-match |
| `src/client/locations-screen.test.tsx` | test | event-driven | `src/client/events-screen.test.tsx` | exact |
| `src/client/main.locations-nav.test.tsx` | test | event-driven | `src/client/events-screen.test.tsx` | partial |
| `src/test/locations-fixtures.ts` (implied by Wave 0 gaps) | test | batch | none | none |

## Pattern Assignments

### `src/client/locations-screen.tsx` (component, request-response)

**Analog:** `src/client/events-screen.tsx`

**Imports + typed props pattern** (lines 1-23):
```typescript
import { useEffect, useMemo, useRef, useState } from "react";
import type { EventListItem } from "./api/events-client.ts";

export type EventsScreenProps = {
  events: EventListItem[];
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
};
```

**Panel/filter/list/empty/error state pattern** (lines 227-252, 254-325):
```typescript
{error != null && error !== "" ? (
  <div className="events-error" role="alert">Could not load events...</div>
) : null}

{!loading && error == null && filteredEvents.length === 0 ? (
  <div className="events-panel">
    <div className="events-empty">...</div>
  </div>
) : null}

{filteredEvents.length > 0 ? (
  <div className="events-panel">
    <ul className="events-list">{/* rows */}</ul>
  </div>
) : null}
```

**State update + derived list pattern** (lines 48-61):
```typescript
const [filter, setFilter] = useState<EventsFilterState>(DEFAULT_FILTER);
const filteredEvents = useMemo(
  () => filterEventsByTimeframe(events, filter),
  [events, filter],
);
```

---

### `src/client/location-detail-screen.tsx` (component, request-response)

**Analog:** `src/client/media-settings-page.tsx`

**Dedicated screen with explicit back action** (lines 10-14, 59-67):
```typescript
export type MediaSettingsPageProps = {
  onBackToEvents: () => void;
};

<div className="events-toolbar">
  <button type="button" className="events-btn" onClick={onBackToEvents}>
    Back to events
  </button>
</div>
```

**Controlled field/editing pattern** (lines 72-87):
```typescript
<label className="media-capture__field">
  <span>Audio meter sensitivity</span>
  <input
    type="range"
    value={settings.audioLevelBoost}
    onChange={(event) =>
      onChangeSettings({ ...settings, audioLevelBoost: Number(event.currentTarget.value) })
    }
  />
</label>
```

---

### `src/client/api/locations-client.ts` (service, request-response)

**Analog:** `src/client/api/events-client.ts`

**URL + input validation helpers** (lines 16-29):
```typescript
function normalizeBaseUrl(baseUrl: string): string {
  const t = baseUrl.trim();
  return t.endsWith("/") ? t : `${t}/`;
}

function assertValidHomeId(homeId: number): void {
  if (!Number.isFinite(homeId) || !Number.isInteger(homeId)) {
    throw new Error("home_id must be a finite integer");
  }
}
```

**Network + status + JSON error handling pattern** (lines 77-103):
```typescript
let res: Response;
try {
  res = await fetchImpl(url.toString(), { method: "GET" });
} catch (e) {
  throw new Error(`Could not reach orchestrator: ${e instanceof Error ? e.message : String(e)}`);
}

if (!res.ok) {
  const text = await res.text().catch(() => "");
  throw new Error(`Failed to load events (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`);
}
```

---

### `src/client/lib/location-form.ts` (utility, transform)

**Analog:** `src/client/lib/media-settings.ts`

**Typed model + defaults pattern** (lines 1-17):
```typescript
export type MediaDetectionSettings = {
  audioLevelBoost: number;
  audioThreshold: number;
  videoThreshold: number;
  videoCadenceMs: number;
  learningThreshold: number;
};

export const DEFAULT_MEDIA_DETECTION_SETTINGS: MediaDetectionSettings = { ... };
```

**Parse/normalize with safe fallback pattern** (lines 27-53):
```typescript
try {
  const parsed = JSON.parse(raw) as Partial<MediaDetectionSettings>;
  return {
    audioLevelBoost: typeof parsed.audioLevelBoost === "number"
      ? parsed.audioLevelBoost
      : DEFAULT_MEDIA_DETECTION_SETTINGS.audioLevelBoost,
    // ...
  };
} catch {
  return DEFAULT_MEDIA_DETECTION_SETTINGS;
}
```

---

### `src/routes/locations.ts` (route, request-response)

**Analog:** `src/routes/events.ts`

**Shared JSON response helper pattern** (lines 5-10):
```typescript
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

**Parse + validate + explicit 4xx responses pattern** (lines 27-37):
```typescript
let raw: unknown;
try {
  raw = await req.json();
} catch {
  return json({ error: "invalid JSON" }, 400);
}
const parsed = parsePostEventBody(raw);
if (!parsed) return json({ error: "invalid body" }, 400);
```

**Access guard pattern before mutation/read** (lines 39-44):
```typescript
const home = db.query("SELECT 1 AS ok FROM homes WHERE id = $id").get({ $id: parsed.home_id });
if (!home) {
  return json({ error: "home not found" }, 404);
}
```

---

### `src/db/locations.ts` (service, CRUD)

**Analog:** `src/db/homes.ts`

**Small focused DB helper function pattern** (lines 3-16):
```typescript
export function createHome(db: Database, { name }: { name: string }): number {
  const result = db.run("INSERT INTO homes (name) VALUES ($name)", { $name: name });
  return Number(result.lastInsertRowid);
}
```

**Membership/association helper pattern** (lines 18-26):
```typescript
export function addUserToHome(db: Database, { homeId, userId }: { homeId: number; userId: number }): void {
  db.run("INSERT INTO home_members (home_id, user_id) VALUES ($homeId, $userId)", {
    $homeId: homeId,
    $userId: userId,
  });
}
```

---

### `src/db/migrations/003_locations_lifecycle.sql` (migration, CRUD)

**Analog:** `src/db/migrations/002_events_subscribers.sql`

**Migration shape pattern** (lines 1-31):
```sql
-- Phase X: <scope>.
CREATE TABLE events (...);
CREATE TABLE subscribers (...);
CREATE TABLE event_deliveries (...);
CREATE INDEX idx_events_home ON events (home_id);
```

**Apply-order compatibility pattern** (from `src/db/migrate.ts` lines 36-61):
```typescript
const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));
// each file is applied once and recorded in schema_migrations
```

---

### `src/types/locations-api.ts` (model, transform)

**Analog:** `src/types/events-api.ts`

**Locked DTO type export pattern** (lines 1-12):
```typescript
/** Locked JSON contract for POST /events (Phase 2). */
export type PostEventBody = {
  home_id: number;
  event_type: string;
  body?: unknown;
};
```

---

### `src/client/main.tsx` (modify; component, event-driven)

**Analog:** `src/client/main.tsx`

**Screen-switch orchestrator pattern** (lines 16-36):
```typescript
const [screen, setScreen] = useState<"events" | "settings">("events");

if (screen === "settings") {
  return <MediaSettingsPage ... onBackToEvents={() => setScreen("events")} />;
}
```

**Root mount invariant pattern** (lines 61-66):
```typescript
const rootEl = document.getElementById("root");
if (rootEl == null) throw new Error("missing #root");
createRoot(rootEl).render(<App />);
```

---

### `src/server.ts` (modify; route, request-response)

**Analog:** `src/server.ts`

**Route dispatch pattern** (lines 62-73):
```typescript
if (path === "/events" && req.method === "GET") return withCorsDev(await handleGetEvents(req, db), req);
if (path === "/events" && req.method === "POST") return withCorsDev(await handlePostEvent(req, db), req);
if (path === "/subscribers" && req.method === "POST") return handlePostSubscriber(req, db);
return new Response("Not Found", { status: 404 });
```

**Request timing log pattern** (lines 88-97):
```typescript
const t0 = performance.now();
const res = await routeRequest(req, db);
const ms = Math.round(performance.now() - t0);
console.log(`[orchestrator] ${req.method} ${path} → ${res.status} ${ms}ms`);
```

---

### `src/routes/locations.test.ts` (test, request-response)

**Analog:** `src/orchestrator.integration.test.ts`

**Ephemeral DB + server setup pattern** (lines 17-23):
```typescript
const dir = mkdtempSync(join(tmpdir(), "home-assist-integ-"));
const dbPath = join(dir, "app.sqlite");
migrate(dbPath);
const { server, url, db } = createServer({ port: 0, sqlitePath: dbPath });
const base = url.origin;
```

**Request/response assertions pattern** (lines 76-109):
```typescript
const ev = await fetch(`${base}/events`, { method: "POST", ... });
expect(ev.status).toBe(201);
const list = await fetch(`${base}/events?home_id=${encodeURIComponent(String(homeId))}`);
expect(list.status).toBe(200);
```

---

### `src/client/locations-screen.test.tsx` (test, event-driven)

**Analog:** `src/client/events-screen.test.tsx`

**happy-dom setup pattern** (lines 6-13):
```typescript
const happyWindow = new GlobalWindow({ url: "http://localhost/" });
globalThis.window = happyWindow as unknown as Window & typeof globalThis;
globalThis.document = happyWindow.document;
```

**Render + interaction-state assertion pattern** (lines 34-58):
```typescript
const { getByText, container } = render(<EventsScreen ... />);
expect(getByText("media.audio")).toBeDefined();
expect(container.querySelectorAll(".events-row").length).toBe(2);
```

---

### `src/client/main.locations-nav.test.tsx` (test, event-driven)

**Analog:** `src/client/events-screen.test.tsx` (partial)

**Primary reusable test style**:
- Keep lightweight DOM setup with `happy-dom`.
- Assert navigation-visible text/buttons and state transitions through rendered output.
- Follow `render(...)` + `expect(...)` structure used in existing client tests.

---

### `src/test/locations-fixtures.ts` (implied test utility, batch)

**Analog:** none found.

Use existing helper style as partial inspiration from `src/db/homes.ts`:
```typescript
export function createHome(db: Database, { name }: { name: string }): number {
  const result = db.run("INSERT INTO homes (name) VALUES ($name)", { $name: name });
  return Number(result.lastInsertRowid);
}
```

## Shared Patterns

### Request Validation + Error Response
**Source:** `src/routes/events.ts` (lines 5-10, 27-37, 83-89)  
**Apply to:** `src/routes/locations.ts`, `src/server.ts` route branches
```typescript
function json(data: unknown, status = 200): Response { ... }
// parse req.json with try/catch; return { error: "..."} with 400/404 explicitly
```

### Access-Scope Guard Before Data Return
**Source:** `src/routes/events.ts` (lines 39-44)  
**Apply to:** list/detail/edit/archive/restore handlers
```typescript
const home = db.query("SELECT 1 AS ok FROM homes WHERE id = $id").get({ $id });
if (!home) return json({ error: "home not found" }, 404);
```

### Client Fetch Wrapper Semantics
**Source:** `src/client/api/events-client.ts` (lines 77-103, 122-139)  
**Apply to:** `src/client/api/locations-client.ts`
```typescript
// catch network errors and rethrow with user-actionable context
// include HTTP status and truncated body text on !res.ok
```

### Screen Orchestration in App Shell
**Source:** `src/client/main.tsx` (lines 16-58)  
**Apply to:** hub/detail navigation wiring
```typescript
const [screen, setScreen] = useState<...>(...);
if (screen === "...") return <... />;
return <... onOpen...={() => setScreen("...")} />;
```

### Migration Numbering and Idempotency
**Source:** `src/db/migrate.ts` (lines 36-61) + `src/db/migrate.test.ts` (lines 47-63)  
**Apply to:** `003_locations_lifecycle.sql` and migration tests
```typescript
// migration files sorted lexicographically and recorded in schema_migrations once
```

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/test/locations-fixtures.ts` | test utility | batch | No existing shared fixture module in `src/test` or `src/db` test helpers; current tests inline setup per file. |

## Metadata

**Analog search scope:** `src/client`, `src/client/api`, `src/client/lib`, `src/routes`, `src/db`, `src/db/migrations`, `src/types`, `src/**/*.test.ts*`  
**Files scanned:** 16  
**Pattern extraction date:** 2026-04-16
