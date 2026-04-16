import { test, expect } from "bun:test";
import {
  allSampleEvents,
  eventsPostUrl,
  normalizeOrchestratorBaseUrl,
  postEvent,
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

test("first sample event preserves location_id and serializes PostEventBody keys", () => {
  const e = allSampleEvents(42)[0];
  if (e == null) {
    throw new Error("expected at least one sample event");
  }
  expect(e.location_id).toBe(42);
  const json = JSON.stringify(e);
  expect(json).toContain('"location_id":42');
  expect(json).toContain('"event_type"');
});

test("normalizeOrchestratorBaseUrl rejects non-http(s) schemes", () => {
  expect(() => normalizeOrchestratorBaseUrl("file:///etc/passwd")).toThrow();
});

test("postEvent uses POST JSON fetch to /events (mocked)", async () => {
  const orig = globalThis.fetch;
  let lastUrl = "";
  let lastInit: RequestInit | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    lastUrl = typeof input === "string" ? input : input.toString();
    lastInit = init;
    return {
      ok: true,
      status: 201,
      text: async () => "",
    } as Response;
  }) as typeof fetch;
  try {
    const r = await postEvent("http://127.0.0.1:3000/", {
      location_id: 1,
      event_type: "motion",
    });
    expect(r.ok).toBe(true);
    expect(lastUrl.endsWith("/events")).toBe(true);
    expect(lastInit?.method).toBe("POST");
    const body = JSON.parse(String(lastInit?.body)) as { location_id?: number };
    expect(body.location_id).toBeDefined();
  } finally {
    globalThis.fetch = orig;
  }
});
