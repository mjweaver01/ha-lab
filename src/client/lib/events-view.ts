import type { EventListItem } from "../api/events-client.ts";

export type EventsFilterMode = "tail" | "timeframe";
export type TimeRangePreset =
  | "15m"
  | "1h"
  | "3h"
  | "6h"
  | "12h"
  | "24h"
  | "3d"
  | "7d"
  | "30d"
  | "custom";

export type EventsFilterState = {
  mode: EventsFilterMode;
  preset: TimeRangePreset;
  customStart: string;
  customEnd: string;
  searchQuery: string;
};

export type VirtualWindow = {
  start: number;
  end: number;
};

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function parseDateMs(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function computeTimeframe(
  filter: EventsFilterState,
  nowMs: number,
): { startMs: number | null; endMs: number | null } {
  if (filter.mode !== "timeframe") {
    return { startMs: null, endMs: null };
  }

  switch (filter.preset) {
    case "15m":
      return { startMs: nowMs - 15 * MINUTE_MS, endMs: nowMs };
    case "1h":
      return { startMs: nowMs - HOUR_MS, endMs: nowMs };
    case "3h":
      return { startMs: nowMs - 3 * HOUR_MS, endMs: nowMs };
    case "6h":
      return { startMs: nowMs - 6 * HOUR_MS, endMs: nowMs };
    case "12h":
      return { startMs: nowMs - 12 * HOUR_MS, endMs: nowMs };
    case "24h":
      return { startMs: nowMs - 24 * HOUR_MS, endMs: nowMs };
    case "3d":
      return { startMs: nowMs - 3 * DAY_MS, endMs: nowMs };
    case "7d":
      return { startMs: nowMs - 7 * DAY_MS, endMs: nowMs };
    case "30d":
      return { startMs: nowMs - 30 * DAY_MS, endMs: nowMs };
    case "custom":
      return {
        startMs: parseDateMs(filter.customStart),
        endMs: parseDateMs(filter.customEnd),
      };
    default:
      return { startMs: null, endMs: null };
  }
}

export function filterEventsByTimeframe(
  events: readonly EventListItem[],
  filter: EventsFilterState,
  nowMs: number = Date.now(),
): EventListItem[] {
  const { startMs, endMs } = computeTimeframe(filter, nowMs);
  if (startMs == null && endMs == null) {
    return [...events];
  }

  return events.filter((event) => {
    const eventMs = Date.parse(event.created_at);
    if (!Number.isFinite(eventMs)) {
      return false;
    }
    if (startMs != null && eventMs < startMs) {
      return false;
    }
    if (endMs != null && eventMs > endMs) {
      return false;
    }
    return true;
  });
}

function stringifyBody(body: unknown): string {
  if (body == null) {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  try {
    return JSON.stringify(body);
  } catch {
    return "";
  }
}

export function filterEventsBySearch(
  events: readonly EventListItem[],
  query: string,
): EventListItem[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    return [...events];
  }
  return events.filter((event) => {
    const haystack = [
      event.event_type,
      event.created_at,
      String(event.location_id),
      stringifyBody(event.body),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function paginateEvents(
  events: readonly EventListItem[],
  page: number,
  pageSize: number,
): { pageEvents: EventListItem[]; totalPages: number; page: number } {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(events.length / safePageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safePageSize;
  const end = start + safePageSize;
  return {
    pageEvents: events.slice(start, end),
    totalPages,
    page: safePage,
  };
}

export function computeVirtualWindow(
  totalRows: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  overscan: number,
): VirtualWindow {
  if (totalRows <= 0) {
    return { start: 0, end: 0 };
  }
  const safeRowHeight = Math.max(1, rowHeight);
  const safeOverscan = Math.max(0, overscan);
  const start = Math.max(0, Math.floor(scrollTop / safeRowHeight) - safeOverscan);
  const visibleCount = Math.ceil(viewportHeight / safeRowHeight);
  const end = Math.min(totalRows, start + visibleCount + safeOverscan * 2);
  return { start, end };
}
