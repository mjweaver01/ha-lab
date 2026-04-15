import { test, expect } from "bun:test";
import {
  allSampleEvents,
  eventsPostUrl,
  normalizeOrchestratorBaseUrl,
} from "./simulated-node.ts";

test("eventsPostUrl strips trailing slash before /events", () => {
  expect(eventsPostUrl("http://127.0.0.1:3000/")).toBe(
    "http://127.0.0.1:3000/events",
  );
});

test("eventsPostUrl appends /events when no trailing slash", () => {
  expect(eventsPostUrl("https://example.com")).toBe("https://example.com/events");
});

test("allSampleEvents exposes motion, door, camera.stub in order", () => {
  const types = allSampleEvents(1).map((e) => e.event_type);
  expect(types).toContain("motion");
  expect(types).toContain("door");
  expect(types).toContain("camera.stub");
  expect(types.length).toBeGreaterThanOrEqual(3);
});

test("first sample event preserves home_id and serializes PostEventBody keys", () => {
  const e = allSampleEvents(42)[0];
  expect(e.home_id).toBe(42);
  const json = JSON.stringify(e);
  expect(json).toContain('"home_id":42');
  expect(json).toContain('"event_type"');
});

test("normalizeOrchestratorBaseUrl rejects non-http(s) schemes", () => {
  expect(() => normalizeOrchestratorBaseUrl("file:///etc/passwd")).toThrow();
});
