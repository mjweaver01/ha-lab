import { describe, expect, test } from "bun:test";
import type { EventListItem } from "../api/events-client.ts";
import {
  computeVirtualWindow,
  filterEventsByTimeframe,
  paginateEvents,
  type EventsFilterState,
} from "./events-view.ts";

function makeEvent(id: number, createdAt: string): EventListItem {
  return {
    id,
    home_id: 7,
    event_type: "test.event",
    created_at: createdAt,
    body: null,
  };
}

describe("events-view", () => {
  test("filterEventsByTimeframe returns all in tail mode", () => {
    const events = [
      makeEvent(1, "2026-01-01T00:00:00.000Z"),
      makeEvent(2, "2026-01-01T00:10:00.000Z"),
    ];
    const filter: EventsFilterState = {
      mode: "tail",
      preset: "1h",
      customStart: "",
      customEnd: "",
    };
    const result = filterEventsByTimeframe(events, filter, Date.parse("2026-01-01T00:15:00.000Z"));
    expect(result.map((event) => event.id)).toEqual([1, 2]);
  });

  test("filterEventsByTimeframe applies preset range", () => {
    const now = Date.parse("2026-01-01T01:00:00.000Z");
    const events = [
      makeEvent(1, "2026-01-01T00:20:00.000Z"),
      makeEvent(2, "2026-01-01T00:40:00.000Z"),
      makeEvent(3, "2026-01-01T00:59:59.000Z"),
    ];
    const filter: EventsFilterState = {
      mode: "timeframe",
      preset: "15m",
      customStart: "",
      customEnd: "",
    };
    const result = filterEventsByTimeframe(events, filter, now);
    expect(result.map((event) => event.id)).toEqual([3]);
  });

  test("paginateEvents returns clamped page with slice", () => {
    const events = [1, 2, 3, 4, 5].map((id) => makeEvent(id, "2026-01-01T00:00:00.000Z"));
    const result = paginateEvents(events, 99, 2);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(3);
    expect(result.pageEvents.map((event) => event.id)).toEqual([5]);
  });

  test("computeVirtualWindow computes overscanned bounds", () => {
    const window = computeVirtualWindow(100, 600, 400, 80, 2);
    expect(window.start).toBe(5);
    expect(window.end).toBe(14);
  });
});
