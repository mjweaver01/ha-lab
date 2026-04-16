import type { EventsAnalyticsResponse } from "../../types/events-analytics-api.ts";

function toShortTimestamp(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return value;
  }
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()} ${String(date.getUTCHours()).padStart(2, "0")}:00`;
}

export function toVolumeSeries(data: EventsAnalyticsResponse) {
  return data.volumeTrend.map((row) => ({
    label: toShortTimestamp(row.bucket_start),
    eventCount: row.event_count,
  }));
}

export function toDistributionSeries(data: EventsAnalyticsResponse) {
  return data.eventTypeDistribution.map((row) => ({
    eventType: row.event_type,
    count: row.event_count,
    percent: row.percent,
  }));
}

export function toConfidenceSeries(data: EventsAnalyticsResponse) {
  return data.confidenceTrend.map((row) => ({
    label: toShortTimestamp(row.bucket_start),
    avgConfidence: Number((row.average_confidence * 100).toFixed(1)),
    samples: row.sample_count,
  }));
}
