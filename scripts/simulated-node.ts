/**
 * Simulated hardware node — POSTs sample events to the Phase 2 orchestrator.
 * Reads `ORCHESTRATOR_URL` (or `--url`) for the base; posts to `/events`.
 */

/** Phase 2 contract — field names must match orchestrator `PostEventBody`. */
export interface PostEventBody {
  home_id: number;
  event_type: string;
  body?: unknown;
}

/** Normalize and validate orchestrator base URL (http/https only). */
export function normalizeOrchestratorBaseUrl(base: string): string {
  const t = base.trim();
  if (!t) {
    throw new Error("ORCHESTRATOR_URL or --url is required");
  }
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    throw new Error("Invalid orchestrator URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported URL scheme: ${url.protocol}`);
  }
  return url.href;
}

/** Strip a single trailing `/` if present. */
export function stripTrailingSlashOnce(base: string): string {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

/** Full URL for `POST /events` (no `//` before `events`). */
export function eventsPostUrl(base: string): string {
  return `${stripTrailingSlashOnce(normalizeOrchestratorBaseUrl(base))}/events`;
}

export function sampleMotion(home_id: number): PostEventBody {
  return {
    home_id,
    event_type: "motion",
    body: { zone: "driveway", confidence: 0.92 },
  };
}

export function sampleDoor(home_id: number): PostEventBody {
  return {
    home_id,
    event_type: "door",
    body: { door_id: "front", state: "closed" },
  };
}

export function sampleCameraStub(home_id: number): PostEventBody {
  return {
    home_id,
    event_type: "camera.stub",
    body: { clip_id: "demo-001", reason: "motion" },
  };
}

export function allSampleEvents(home_id: number): PostEventBody[] {
  return [sampleMotion(home_id), sampleDoor(home_id), sampleCameraStub(home_id)];
}
