import { describe, expect, test } from "bun:test";
import type { EventListItem } from "../api/events-client.ts";
import { markNewEventIds, maxEventId } from "./new-events.ts";

const e = (id: number): EventListItem => ({
  id,
  location_id: 1,
  event_type: "t",
  created_at: "2026-01-01T00:00:00.000Z",
  body: null,
});

describe("maxEventId", () => {
  test("empty", () => {
    expect(maxEventId([])).toBeUndefined();
  });
  test("max", () => {
    expect(maxEventId([e(1), e(5), e(3)])).toBe(5);
  });
});

describe("markNewEventIds", () => {
  test("first snapshot — no highlights", () => {
    const s = markNewEventIds(undefined, [e(1), e(2)]);
    expect(s.size).toBe(0);
  });

  test("growing snapshot marks new ids", () => {
    const prev = 2;
    const next = [e(1), e(2), e(3)];
    const s = markNewEventIds(prev, next);
    expect([...s]).toEqual([3]);
  });
});
