# Phase 06: media-signals-events - Pattern Map

**Mapped:** 2026-04-15  
**Files analyzed:** 11  
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/client/api/events-client.ts` (modify: add `postEvent`) | service | request-response | `src/client/api/events-client.ts`, `scripts/simulated-node.ts` | exact |
| `src/client/lib/media-event-types.ts` (new) | utility | transform | `src/client/lib/new-events.ts`, `src/types/events-api.ts` | role-match |
| `src/client/lib/media-throttle.ts` (new) | utility | event-driven | `src/client/hooks/use-events-poll.ts`, `src/client/lib/new-events.ts` | role-match |
| `src/client/lib/media-signals.ts` (new) | service | streaming | `src/client/hooks/use-media-capture.ts` | role-match |
| `src/client/hooks/use-media-capture.ts` (modify: integrate signal pipeline) | hook | streaming | `src/client/hooks/use-media-capture.ts` | exact |
| `src/client/media-capture-section.tsx` (possible modify if hook contract changes) | component | event-driven | `src/client/media-capture-section.tsx` | exact |
| `src/client/lib/media-signals-audio.test.ts` (new) | test | event-driven | `src/client/hooks/use-media-capture.test.ts`, `src/client/lib/new-events.test.ts` | role-match |
| `src/client/lib/media-signals-video.test.ts` (new) | test | event-driven | `src/client/hooks/use-media-capture.test.ts` | role-match |
| `src/client/api/events-client.post.test.ts` (new) | test | request-response | `src/client/api/events-client.test.ts` | exact |
| `src/server.ts` (modify: CORS for browser POST preflight) | middleware | request-response | `src/server.ts` | exact |
| `src/orchestrator.integration.test.ts` (modify: CORS OPTIONS/POST assertions) | test | request-response | `src/orchestrator.integration.test.ts` | exact |

## Pattern Assignments

### `src/client/api/events-client.ts` (service, request-response)

**Analog:** `src/client/api/events-client.ts` + `scripts/simulated-node.ts`

**Imports/types pattern** (`src/client/api/events-client.ts` lines 6-13):
```typescript
export type EventListItem = {
  id: number;
  home_id: number;
  event_type: string;
  created_at: string;
  body: unknown | null;
};
```

**URL normalization + input guards** (`src/client/api/events-client.ts` lines 15-24):
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

**Fetch error wrapping pattern** (`src/client/api/events-client.ts` lines 65-77):
```typescript
let res: Response;
try {
  res = await fetchImpl(url.toString(), { method: "GET" });
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  throw new Error(`Could not reach orchestrator: ${msg}`);
}

if (!res.ok) {
  const text = await res.text().catch(() => "");
  throw new Error(
    `Failed to load events (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
  );
}
```

**POST request shape pattern** (`scripts/simulated-node.ts` lines 71-80):
```typescript
export async function postEvent(
  baseUrl: string,
  payload: PostEventBody,
): Promise<Response> {
  return fetch(eventsPostUrl(baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
```

---

### `src/client/lib/media-event-types.ts` (utility, transform)

**Analog:** `src/client/lib/new-events.ts` + `src/types/events-api.ts`

**Small pure utility module pattern** (`src/client/lib/new-events.ts` lines 4-7):
```typescript
export function maxEventId(events: EventListItem[]): number | undefined {
  if (events.length === 0) return undefined;
  return Math.max(...events.map((e) => e.id));
}
```

**Locked payload contract anchor** (`src/types/events-api.ts` lines 1-6):
```typescript
export type PostEventBody = {
  home_id: number;
  event_type: string;
  body?: unknown;
};
```

**Apply pattern:** keep this module as the single source for:
- `MEDIA_AUDIO_EVENT_TYPE = "media.audio"`
- `MEDIA_VIDEO_EVENT_TYPE = "media.video"`
- JSON-safe body type helpers/builders used by both audio and video emitters.

---

### `src/client/lib/media-throttle.ts` (utility, event-driven)

**Analog:** `src/client/hooks/use-events-poll.ts` + `src/client/lib/new-events.ts`

**Per-flow guard state pattern** (`src/client/hooks/use-events-poll.ts` lines 28-33):
```typescript
const previousMaxRef = useRef<number | undefined>(undefined);
const inFlightRef = useRef(false);

const refresh = useCallback(async () => {
  if (inFlightRef.current) return;
  inFlightRef.current = true;
```

**Simple threshold comparison pattern** (`src/client/lib/new-events.ts` lines 17-24):
```typescript
const next = new Set<number>();
const floor = previousMax ?? Number.POSITIVE_INFINITY;
for (const e of events) {
  if (e.id > floor) {
    next.add(e.id);
  }
}
```

**Apply pattern:** represent independent clocks (`audioLastPostedAt`, `videoLastPostedAt`) and expose helpers like `canPostAudio(nowMs)` / `markAudioPosted(nowMs)` and `canPostVideo(nowMs)` / `markVideoPosted(nowMs)`.

---

### `src/client/lib/media-signals.ts` (service, streaming)

**Analog:** `src/client/hooks/use-media-capture.ts`

**Lifecycle + resource refs pattern** (`src/client/hooks/use-media-capture.ts` lines 23-29):
```typescript
const micStreamRef = useRef<MediaStream | null>(null);
const cameraStreamRef = useRef<MediaStream | null>(null);
const videoRef = useRef<HTMLVideoElement | null>(null);
const audioContextRef = useRef<AudioContext | null>(null);
const analyserRef = useRef<AnalyserNode | null>(null);
const rafRef = useRef<number | null>(null);
```

**Sampling loop pattern** (`src/client/hooks/use-media-capture.ts` lines 89-103):
```typescript
const buffer = new Float32Array(analyser.fftSize);
const tick = () => {
  const a = analyserRef.current;
  if (a == null) return;
  a.getFloatTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const x = buffer[i] ?? 0;
    sum += x * x;
  }
  rafRef.current = requestAnimationFrame(tick);
};
```

**Teardown discipline pattern** (`src/client/hooks/use-media-capture.ts` lines 162-186):
```typescript
useEffect(() => {
  return () => {
    const ms = micStreamRef.current;
    const cs = cameraStreamRef.current;
    micStreamRef.current = null;
    cameraStreamRef.current = null;
    if (ms != null) for (const t of ms.getTracks()) t.stop();
    if (cs != null) for (const t of cs.getTracks()) t.stop();
    // ... cancel RAF, close AudioContext, clear video srcObject
  };
}, []);
```

**Apply pattern:** mirror this lifecycle style for MediaPipe task init/dispose and classify loops; keep comments documenting video sample cadence for inspectability.

---

### `src/client/hooks/use-media-capture.ts` (hook, streaming)

**Analog:** `src/client/hooks/use-media-capture.ts` (self)

**Error integration pattern** (lines 3-4, 106-110, 139-142):
```typescript
import { formatMediaError, formatTrackEndedMessage } from "../lib/media-errors.ts";
// ...
} catch (e) {
  setMicError(formatMediaError("mic", e));
  clearMicAnalysis();
  setMicActive(false);
}
// ...
} catch (e) {
  setCameraError(formatMediaError("camera", e));
  setCameraActive(false);
}
```

**Track-ended fallback pattern** (lines 74-79, 127-131):
```typescript
for (const track of stream.getAudioTracks()) {
  track.onended = () => {
    setMicError(formatTrackEndedMessage("mic"));
    stopMicTracks();
  };
}
```

**Apply pattern:** if this hook receives/owns media-signal callbacks, preserve explicit stop/start behavior and keep all failure paths non-silent with existing error copy style.

---

### `src/client/media-capture-section.tsx` (component, event-driven)

**Analog:** `src/client/media-capture-section.tsx`

**Hook-to-UI wiring pattern** (lines 3-15):
```tsx
export function MediaCaptureSection() {
  const {
    micActive,
    cameraActive,
    micLevel,
    micError,
    cameraError,
    startMic,
    stopMic,
    startCamera,
    stopCamera,
    videoRef,
  } = useMediaCapture();
```

**User-visible error pattern** (lines 77-82):
```tsx
{micError != null || cameraError != null ? (
  <div className="events-error" role="alert">
    {micError != null ? <div>{micError}</div> : null}
    {cameraError != null ? <div>{cameraError}</div> : null}
  </div>
) : null}
```

**Apply pattern:** keep UI as rendering/control surface; keep classification + POST logic outside component (lib/hook layer).

---

### `src/client/lib/media-signals-audio.test.ts` (test, event-driven)

**Analog:** `src/client/hooks/use-media-capture.test.ts` + `src/client/lib/new-events.test.ts`

**Browser API mocking pattern** (`src/client/hooks/use-media-capture.test.ts` lines 37-49):
```typescript
beforeEach(() => {
  globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    // ...
  };
  globalThis.cancelAnimationFrame = (id: number) => {
    happyWindow.clearTimeout(id);
  };
});
```

**Deterministic helper-fixture style** (`src/client/lib/new-events.test.ts` lines 5-11):
```typescript
const e = (id: number): EventListItem => ({
  id,
  home_id: 1,
  event_type: "t",
  created_at: "2026-01-01T00:00:00.000Z",
  body: null,
});
```

**Apply pattern:** model classifier outputs as small fixtures, assert throttle windows and emitted payload mapping deterministically.

---

### `src/client/lib/media-signals-video.test.ts` (test, event-driven)

**Analog:** `src/client/hooks/use-media-capture.test.ts`

**Media stream test-double pattern** (lines 51-64):
```typescript
function makeTrack(kind: "audio" | "video"): MediaStreamTrack { /* ... */ }

function makeStream(tracks: MediaStreamTrack[]): MediaStream {
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === "audio"),
    getVideoTracks: () => tracks.filter((t) => t.kind === "video"),
  } as MediaStream;
}
```

**Async state assertion pattern** (lines 106-115):
```typescript
await act(async () => {
  await result.current.startMic();
});

await waitFor(() => {
  expect(result.current.micError).not.toBeNull();
});
```

**Apply pattern:** use fake video element readiness/time ticks and assert cadence + 4s throttle behavior through controlled clock advancement.

---

### `src/client/api/events-client.post.test.ts` (test, request-response)

**Analog:** `src/client/api/events-client.test.ts`

**Captured-request assertion pattern** (`src/client/api/events-client.test.ts` lines 6-27):
```typescript
const captured: string[] = [];
const fetchImpl: typeof fetch = async (input) => {
  captured.push(typeof input === "string" ? input : input.toString());
  return new Response(JSON.stringify([/* ... */]), { status: 200 });
};

const rows = await fetchEvents("http://127.0.0.1:3000", 7, fetchImpl);
expect(captured[0]).toContain("/events");
```

**Validation failure tests pattern** (`src/client/api/events-client.test.ts` lines 30-33):
```typescript
await expect(fetchEvents("http://x", 1.5, mock())).rejects.toThrow();
await expect(fetchEvents("http://x", Number.NaN, mock())).rejects.toThrow();
```

**Apply pattern:** assert method is `POST`, path is `/events`, body encodes `PostEventBody`, and network/non-2xx errors are wrapped with readable messages.

---

### `src/server.ts` (middleware, request-response)

**Analog:** `src/server.ts` (self)

**Centralized CORS helper pattern** (lines 7-16, 18-24):
```typescript
function corsDevHeaders(req: Request): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  h.set("Access-Control-Allow-Headers", req.headers.get("Access-Control-Request-Headers") ?? "Content-Type");
  return h;
}
```

**Route-level OPTIONS + CORS wrap pattern** (lines 55-65):
```typescript
if (path === "/events" && req.method === "OPTIONS") {
  return new Response(null, { status: 204, headers: corsDevHeaders(req) });
}

if (path === "/events" && req.method === "GET") {
  const res = await handleGetEvents(req, db);
  return withCorsDev(res, req);
}
```

**Apply pattern:** extend this same helper/wrapper approach to POST support, rather than introducing separate ad-hoc header logic.

---

### `src/orchestrator.integration.test.ts` (test, request-response)

**Analog:** `src/orchestrator.integration.test.ts` (self)

**Ephemeral server + DB setup pattern** (lines 17-23):
```typescript
const dir = mkdtempSync(join(tmpdir(), "home-assist-integ-"));
const dbPath = join(dir, "app.sqlite");
migrate(dbPath);

const { server, url, db } = createServer({ port: 0, sqlitePath: dbPath });
const base = url.origin;
```

**Round-trip HTTP assertions pattern** (lines 65-76, 87-93):
```typescript
const ev = await fetch(`${base}/events`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ home_id: homeId, event_type: "motion.detected", body: { room: "hall" } }),
});
expect(ev.status).toBe(201);

const list = await fetch(`${base}/events?home_id=${encodeURIComponent(String(homeId))}`);
expect(list.status).toBe(200);
```

**Apply pattern:** add OPTIONS preflight + CORS header assertions in this same integration style.

## Shared Patterns

### Event Contract + Validation
**Source:** `src/types/events-api.ts`, `src/routes/events.ts`  
**Apply to:** `events-client` POST helper, `media-event-types`, media signal emitters
```typescript
export type PostEventBody = {
  home_id: number;
  event_type: string;
  body?: unknown;
};

if (typeof o.home_id !== "number" || !Number.isInteger(o.home_id)) return null;
if (typeof o.event_type !== "string" || o.event_type.trim() === "") return null;
```

### JSON-safe Body Handling
**Source:** `src/routes/events.ts`  
**Apply to:** audio/video body builders
```typescript
const bodyStr = parsed.body !== undefined ? JSON.stringify(parsed.body) : null;
```

### Client Error Message Wrapping
**Source:** `src/client/api/events-client.ts`  
**Apply to:** `postEvent` failures and media signal pipeline transport errors
```typescript
const msg = e instanceof Error ? e.message : String(e);
throw new Error(`Could not reach orchestrator: ${msg}`);
```

### Non-silent Media Failures
**Source:** `src/client/lib/media-errors.ts`, `src/client/media-capture-section.tsx`  
**Apply to:** MediaPipe init/classification failures surfaced to users
```typescript
setMicError(formatMediaError("mic", e));
setCameraError(formatMediaError("camera", e));
```

### Browser CORS Handling
**Source:** `src/server.ts`  
**Apply to:** all `/events` methods touched by browser client
```typescript
h.set("Access-Control-Allow-Origin", "*");
h.set("Access-Control-Allow-Methods", "GET, OPTIONS");
```

## No Analog Found

None. All planned files have at least a role-match analog in current code.

## Metadata

**Analog search scope:** `src/client/**`, `src/routes/**`, `src/server.ts`, `src/types/**`, `scripts/**`, `src/*.integration.test.ts`  
**Files scanned:** 18  
**Pattern extraction date:** 2026-04-15
