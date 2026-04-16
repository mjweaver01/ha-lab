import type { Database, SQLQueryBindings } from "bun:sqlite";
import type { EventsAnalyticsBucket, EventsAnalyticsRange } from "../types/events-analytics-api.ts";

export type AnalyticsScope = {
  userId: number;
  locationId: number | null;
  eventType: string | null;
  startIso: string | null;
  endIso: string | null;
  bucketSeconds: number;
};

type SqlFilters = {
  whereSql: string;
  bindings: SQLQueryBindings[];
};

const RANGE_MS: Record<EventsAnalyticsRange, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

const BUCKET_SECONDS: Record<EventsAnalyticsBucket, number> = {
  "5m": 5 * 60,
  "15m": 15 * 60,
  "1h": 60 * 60,
  "6h": 6 * 60 * 60,
  "1d": 24 * 60 * 60,
};

export function rangeStartIso(range: EventsAnalyticsRange): string {
  const ms = RANGE_MS[range];
  return new Date(Date.now() - ms).toISOString();
}

export function bucketSecondsFor(bucket: EventsAnalyticsBucket): number {
  return BUCKET_SECONDS[bucket];
}

export function userCanAccessLocation(db: Database, userId: number, locationId: number): boolean {
  const row = db
    .query(
      `SELECT 1 AS ok
       FROM location_members
       WHERE user_id = ? AND location_id = ?`,
    )
    .get(userId, locationId) as { ok: number } | null;
  return row != null;
}

function buildFilters(scope: AnalyticsScope): SqlFilters {
  const bindings: SQLQueryBindings[] = [scope.userId];
  const clauses = ["lm.user_id = ?"];

  if (scope.startIso != null) {
    clauses.push("strftime('%s', e.created_at) >= strftime('%s', ?)");
    bindings.push(scope.startIso);
  }
  if (scope.endIso != null) {
    clauses.push("strftime('%s', e.created_at) <= strftime('%s', ?)");
    bindings.push(scope.endIso);
  }

  if (scope.locationId != null) {
    clauses.push("e.location_id = ?");
    bindings.push(scope.locationId);
  }

  if (scope.eventType != null) {
    clauses.push("e.event_type = ?");
    bindings.push(scope.eventType);
  }

  return {
    whereSql: clauses.join(" AND "),
    bindings,
  };
}

export function queryEventVolumeTrend(db: Database, scope: AnalyticsScope) {
  const filters = buildFilters(scope);
  return db
    .query(
      `SELECT
         datetime((strftime('%s', e.created_at) / ?) * ?, 'unixepoch') AS bucket_start,
         COUNT(*) AS event_count
       FROM events e
       JOIN location_members lm ON lm.location_id = e.location_id
       WHERE ${filters.whereSql}
       GROUP BY bucket_start
       ORDER BY bucket_start ASC`,
    )
    .all(scope.bucketSeconds, scope.bucketSeconds, ...filters.bindings) as Array<{
    bucket_start: string;
    event_count: number;
  }>;
}

export function queryEventTypeDistribution(db: Database, scope: AnalyticsScope) {
  const filters = buildFilters(scope);
  return db
    .query(
      `SELECT e.event_type, COUNT(*) AS event_count
       FROM events e
       JOIN location_members lm ON lm.location_id = e.location_id
       WHERE ${filters.whereSql}
       GROUP BY e.event_type
       ORDER BY event_count DESC, e.event_type ASC`,
    )
    .all(...filters.bindings) as Array<{
    event_type: string;
    event_count: number;
  }>;
}

export function queryConfidenceTrend(db: Database, scope: AnalyticsScope) {
  const filters = buildFilters(scope);
  return db
    .query(
      `SELECT
         datetime((strftime('%s', e.created_at) / ?) * ?, 'unixepoch') AS bucket_start,
         ROUND(AVG(
           COALESCE(
             CAST(json_extract(e.body, '$.confidence') AS REAL),
             CAST(json_extract(e.body, '$.match_score') AS REAL)
           )
         ), 4) AS average_confidence,
         COUNT(*) AS sample_count
       FROM events e
       JOIN location_members lm ON lm.location_id = e.location_id
       WHERE ${filters.whereSql}
         AND e.body IS NOT NULL
         AND COALESCE(
           CAST(json_extract(e.body, '$.confidence') AS REAL),
           CAST(json_extract(e.body, '$.match_score') AS REAL)
         ) IS NOT NULL
       GROUP BY bucket_start
       ORDER BY bucket_start ASC`,
    )
    .all(scope.bucketSeconds, scope.bucketSeconds, ...filters.bindings) as Array<{
    bucket_start: string;
    average_confidence: number;
    sample_count: number;
  }>;
}

export function queryEventTotals(db: Database, scope: AnalyticsScope): {
  events: number;
  confidenceSamples: number;
  distinctEventTypes: number;
} {
  const filters = buildFilters(scope);
  const totals = db
    .query(
      `SELECT
         COUNT(*) AS events,
         COUNT(DISTINCT e.event_type) AS distinct_event_types,
         SUM(
           CASE
             WHEN COALESCE(
               CAST(json_extract(e.body, '$.confidence') AS REAL),
               CAST(json_extract(e.body, '$.match_score') AS REAL)
             ) IS NOT NULL
             THEN 1
             ELSE 0
           END
         ) AS confidence_samples
       FROM events e
       JOIN location_members lm ON lm.location_id = e.location_id
       WHERE ${filters.whereSql}`,
    )
    .get(...filters.bindings) as
    | {
        events: number;
        distinct_event_types: number;
        confidence_samples: number | null;
      }
    | null;

  return {
    events: Number(totals?.events ?? 0),
    distinctEventTypes: Number(totals?.distinct_event_types ?? 0),
    confidenceSamples: Number(totals?.confidence_samples ?? 0),
  };
}
