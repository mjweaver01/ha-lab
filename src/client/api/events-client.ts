/**
 * GET /events client — mirrors Phase 2 JSON from `src/routes/events.ts`.
 * All API strings must be rendered as React text nodes or JSON.stringify in UI — never raw HTML from API fields.
 */
import type { PostEventBody } from "../../types/events-api.ts";

export type EventListItem = {
  id: number;
  home_id: number;
  event_type: string;
  /** ISO string from SQLite `created_at` */
  created_at: string;
  body: unknown | null;
};

function normalizeBaseUrl(baseUrl: string): string {
  const t = baseUrl.trim();
  return t.endsWith("/") ? t : `${t}/`;
}

function eventsUrl(baseUrl: string): URL {
  return new URL("/events", normalizeBaseUrl(baseUrl));
}

function assertValidHomeId(homeId: number): void {
  if (!Number.isFinite(homeId) || !Number.isInteger(homeId)) {
    throw new Error("home_id must be a finite integer");
  }
}

function assertValidEventType(eventType: string): string {
  const normalized = eventType.trim();
  if (!normalized) {
    throw new Error("event_type must be a non-empty string");
  }
  return normalized;
}

function parseEventRow(data: unknown): EventListItem {
  if (typeof data !== "object" || data === null) {
    throw new Error("invalid event row: expected object");
  }
  const o = data as Record<string, unknown>;
  if (typeof o.id !== "number" || !Number.isInteger(o.id)) {
    throw new Error("invalid event row: id");
  }
  if (typeof o.home_id !== "number" || !Number.isInteger(o.home_id)) {
    throw new Error("invalid event row: home_id");
  }
  if (typeof o.event_type !== "string") {
    throw new Error("invalid event row: event_type");
  }
  if (typeof o.created_at !== "string") {
    throw new Error("invalid event row: created_at");
  }
  return {
    id: o.id,
    home_id: o.home_id,
    event_type: o.event_type,
    created_at: o.created_at,
    body: "body" in o ? o.body : null,
  };
}

/**
 * Fetch events for a home from the orchestrator GET /events?home_id=
 */
export async function fetchEvents(
  baseUrl: string,
  homeId: number,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<EventListItem[]> {
  assertValidHomeId(homeId);
  const url = eventsUrl(baseUrl);
  url.searchParams.set("home_id", String(homeId));

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

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    throw new Error("Events response was not valid JSON");
  }

  if (!Array.isArray(raw)) {
    throw new Error("Events response must be a JSON array");
  }

  return raw.map((row) => parseEventRow(row));
}

/**
 * POST /events with the shared `PostEventBody` contract.
 */
export async function postEvent(
  baseUrl: string,
  payload: PostEventBody,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<void> {
  assertValidHomeId(payload.home_id);
  const eventType = assertValidEventType(payload.event_type);
  const url = eventsUrl(baseUrl);
  const requestBody: PostEventBody = {
    ...payload,
    event_type: eventType,
  };

  let res: Response;
  try {
    res = await fetchImpl(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not reach orchestrator: ${msg}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to post event (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }
}
