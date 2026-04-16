import type {
  ConfidenceTrendBucket,
  EventTypeDistributionBucket,
  EventVolumeBucket,
  EventsAnalyticsBucket,
  EventsAnalyticsMode,
  EventsAnalyticsQuery,
  EventsAnalyticsRange,
  EventsAnalyticsResponse,
} from "../../types/events-analytics-api.ts";
import type { FetchLike } from "./events-client.ts";

function normalizeBaseUrl(baseUrl: string): string {
  const t = baseUrl.trim();
  return t.endsWith("/") ? t : `${t}/`;
}

function analyticsUrl(baseUrl: string): URL {
  return new URL("/events/analytics", normalizeBaseUrl(baseUrl));
}

function assertInteger(value: number, label: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`${label} must be a finite integer`);
  }
}

function parseVolumeBucket(data: unknown): EventVolumeBucket {
  if (typeof data !== "object" || data == null) {
    throw new Error("invalid analytics payload: volumeTrend row");
  }
  const row = data as Record<string, unknown>;
  if (typeof row.bucket_start !== "string" || typeof row.event_count !== "number") {
    throw new Error("invalid analytics payload: volumeTrend fields");
  }
  return {
    bucket_start: row.bucket_start,
    event_count: row.event_count,
  };
}

function parseDistributionBucket(data: unknown): EventTypeDistributionBucket {
  if (typeof data !== "object" || data == null) {
    throw new Error("invalid analytics payload: eventTypeDistribution row");
  }
  const row = data as Record<string, unknown>;
  if (
    typeof row.event_type !== "string" ||
    typeof row.event_count !== "number" ||
    typeof row.percent !== "number"
  ) {
    throw new Error("invalid analytics payload: eventTypeDistribution fields");
  }
  return {
    event_type: row.event_type,
    event_count: row.event_count,
    percent: row.percent,
  };
}

function parseConfidenceBucket(data: unknown): ConfidenceTrendBucket {
  if (typeof data !== "object" || data == null) {
    throw new Error("invalid analytics payload: confidenceTrend row");
  }
  const row = data as Record<string, unknown>;
  if (
    typeof row.bucket_start !== "string" ||
    typeof row.average_confidence !== "number" ||
    typeof row.sample_count !== "number"
  ) {
    throw new Error("invalid analytics payload: confidenceTrend fields");
  }
  return {
    bucket_start: row.bucket_start,
    average_confidence: row.average_confidence,
    sample_count: row.sample_count,
  };
}

function parseEventsAnalyticsResponse(data: unknown): EventsAnalyticsResponse {
  if (typeof data !== "object" || data == null) {
    throw new Error("invalid analytics payload: expected object");
  }
  const payload = data as Record<string, unknown>;
  const scope = payload.scope;
  const totals = payload.totals;
  if (typeof scope !== "object" || scope == null) {
    throw new Error("invalid analytics payload: scope");
  }
  if (typeof totals !== "object" || totals == null) {
    throw new Error("invalid analytics payload: totals");
  }
  if (!Array.isArray(payload.volumeTrend)) {
    throw new Error("invalid analytics payload: volumeTrend");
  }
  if (!Array.isArray(payload.eventTypeDistribution)) {
    throw new Error("invalid analytics payload: eventTypeDistribution");
  }
  if (!Array.isArray(payload.confidenceTrend)) {
    throw new Error("invalid analytics payload: confidenceTrend");
  }

  const scopeObj = scope as Record<string, unknown>;
  const totalsObj = totals as Record<string, unknown>;
  if (
    !(
      scopeObj.location_id == null || (typeof scopeObj.location_id === "number" && Number.isInteger(scopeObj.location_id))
    ) ||
    typeof scopeObj.mode !== "string" ||
    !(scopeObj.range == null || typeof scopeObj.range === "string") ||
    typeof scopeObj.bucket !== "string" ||
    !(scopeObj.start_at == null || typeof scopeObj.start_at === "string") ||
    !(scopeObj.end_at == null || typeof scopeObj.end_at === "string") ||
    !(scopeObj.event_type == null || typeof scopeObj.event_type === "string")
  ) {
    throw new Error("invalid analytics payload: scope fields");
  }
  if (
    typeof totalsObj.events !== "number" ||
    typeof totalsObj.confidenceSamples !== "number" ||
    typeof totalsObj.distinctEventTypes !== "number"
  ) {
    throw new Error("invalid analytics payload: totals fields");
  }

  return {
    scope: {
      mode: scopeObj.mode as EventsAnalyticsMode,
      location_id: (scopeObj.location_id as number | null) ?? null,
      range: (scopeObj.range as EventsAnalyticsRange | null) ?? null,
      bucket: scopeObj.bucket as EventsAnalyticsBucket,
      start_at: (scopeObj.start_at as string | null) ?? null,
      end_at: (scopeObj.end_at as string | null) ?? null,
      event_type: (scopeObj.event_type as string | null) ?? null,
    },
    volumeTrend: payload.volumeTrend.map(parseVolumeBucket),
    eventTypeDistribution: payload.eventTypeDistribution.map(parseDistributionBucket),
    confidenceTrend: payload.confidenceTrend.map(parseConfidenceBucket),
    totals: {
      events: totalsObj.events as number,
      confidenceSamples: totalsObj.confidenceSamples as number,
      distinctEventTypes: totalsObj.distinctEventTypes as number,
    },
  };
}

export async function fetchEventsAnalytics(
  baseUrl: string,
  args: { userId: number } & Omit<EventsAnalyticsQuery, "location_id"> & { locationId?: number | null },
  fetchImpl: FetchLike = (input, init) => globalThis.fetch(input, init),
): Promise<EventsAnalyticsResponse> {
  assertInteger(args.userId, "userId");
  if (args.locationId != null) {
    assertInteger(args.locationId, "locationId");
  }

  const url = analyticsUrl(baseUrl);
  if (args.mode != null) {
    url.searchParams.set("mode", args.mode);
  }
  if (args.locationId != null) {
    url.searchParams.set("location_id", String(args.locationId));
  }
  if (args.range != null) {
    url.searchParams.set("range", args.range);
  }
  url.searchParams.set("bucket", args.bucket);
  if (args.start_at != null && args.start_at.trim() !== "") {
    url.searchParams.set("start_at", args.start_at.trim());
  }
  if (args.end_at != null && args.end_at.trim() !== "") {
    url.searchParams.set("end_at", args.end_at.trim());
  }
  if (args.event_type != null && args.event_type.trim() !== "") {
    url.searchParams.set("event_type", args.event_type.trim());
  }

  let res: Response;
  try {
    res = await fetchImpl(url.toString(), {
      method: "GET",
      headers: { "x-user-id": String(args.userId) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not reach orchestrator: ${msg}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to load analytics (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    throw new Error("Analytics response was not valid JSON");
  }
  return parseEventsAnalyticsResponse(raw);
}
