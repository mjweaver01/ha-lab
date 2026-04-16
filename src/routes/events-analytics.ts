import type { Database } from "bun:sqlite";
import {
  ANALYTICS_MODES,
  ANALYTICS_BUCKETS,
  ANALYTICS_RANGES,
  type EventsAnalyticsBucket,
  type EventsAnalyticsMode,
  type EventsAnalyticsRange,
  type EventsAnalyticsResponse,
} from "../types/events-analytics-api.ts";
import {
  bucketSecondsFor,
  queryConfidenceTrend,
  queryEventTotals,
  queryEventTypeDistribution,
  queryEventVolumeTrend,
  rangeStartIso,
  userCanAccessLocation,
} from "../db/event-analytics.ts";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function asRange(value: string | null): EventsAnalyticsRange | null {
  if (value == null) return null;
  return (ANALYTICS_RANGES as readonly string[]).includes(value)
    ? (value as EventsAnalyticsRange)
    : null;
}

function asBucket(value: string | null): EventsAnalyticsBucket | null {
  if (value == null) return null;
  return (ANALYTICS_BUCKETS as readonly string[]).includes(value)
    ? (value as EventsAnalyticsBucket)
    : null;
}

function asMode(value: string | null): EventsAnalyticsMode | null {
  if (value == null) return null;
  return (ANALYTICS_MODES as readonly string[]).includes(value)
    ? (value as EventsAnalyticsMode)
    : null;
}

function asIsoOrNull(value: string | null): string | null | "invalid" {
  if (value == null || value.trim() === "") return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return "invalid";
  return new Date(ms).toISOString();
}

function parseUserId(req: Request): number | null {
  const raw = req.headers.get("x-user-id");
  if (raw == null || raw.trim() === "") return null;
  const userId = Number(raw);
  return Number.isInteger(userId) ? userId : Number.NaN;
}

export async function handleGetEventsAnalytics(req: Request, db: Database): Promise<Response> {
  const userId = parseUserId(req);
  if (userId == null) {
    return json({ error: "x-user-id required" }, 400);
  }
  if (!Number.isInteger(userId)) {
    return json({ error: "invalid x-user-id" }, 400);
  }

  const url = new URL(req.url);
  const rawMode = url.searchParams.get("mode");
  const mode = asMode(rawMode ?? "timeframe");
  if (mode == null) {
    return json({ error: "invalid mode" }, 400);
  }

  const bucket = asBucket(url.searchParams.get("bucket") ?? "15m");
  if (bucket == null) {
    return json({ error: "invalid bucket" }, 400);
  }

  let range: EventsAnalyticsRange | null = null;
  let startAt: string | null = null;
  let endAt: string | null = null;

  if (mode === "timeframe") {
    const start = asIsoOrNull(url.searchParams.get("start_at"));
    const end = asIsoOrNull(url.searchParams.get("end_at"));
    if (start === "invalid" || end === "invalid") {
      return json({ error: "invalid start_at/end_at" }, 400);
    }

    if (start != null || end != null) {
      startAt = start;
      endAt = end;
    } else if (rawMode != null) {
      startAt = null;
      endAt = null;
    } else {
      range = asRange(url.searchParams.get("range") ?? "1h");
      if (range == null) {
        return json({ error: "invalid range" }, 400);
      }
      startAt = rangeStartIso(range);
      endAt = new Date().toISOString();
    }
  }

  const eventTypeParam = url.searchParams.get("event_type");
  const eventType = eventTypeParam != null && eventTypeParam.trim() !== "" ? eventTypeParam.trim() : null;

  const locationParam = url.searchParams.get("location_id");
  let locationId: number | null = null;
  if (locationParam != null && locationParam !== "") {
    const parsed = Number(locationParam);
    if (!Number.isInteger(parsed)) {
      return json({ error: "invalid location_id" }, 400);
    }
    if (!userCanAccessLocation(db, userId, parsed)) {
      return json({ error: "access denied" }, 403);
    }
    locationId = parsed;
  }

  const scope = {
    userId,
    locationId,
    eventType,
    startIso: startAt,
    endIso: endAt,
    bucketSeconds: bucketSecondsFor(bucket),
  };

  const volumeTrend = queryEventVolumeTrend(db, scope);
  const eventTypeCounts = queryEventTypeDistribution(db, scope);
  const confidenceTrend = queryConfidenceTrend(db, scope);
  const totals = queryEventTotals(db, scope);

  const distribution = eventTypeCounts.map((item) => ({
    event_type: item.event_type,
    event_count: item.event_count,
    percent:
      totals.events > 0 ? Number(((item.event_count / totals.events) * 100).toFixed(2)) : 0,
  }));

  const response: EventsAnalyticsResponse = {
    scope: {
      mode,
      location_id: locationId,
      range,
      bucket,
      start_at: startAt,
      end_at: endAt,
      event_type: eventType,
    },
    volumeTrend,
    eventTypeDistribution: distribution,
    confidenceTrend,
    totals,
  };
  return json(response, 200);
}
