import { describe, expect, mock, test } from "bun:test";
import { fetchEvents } from "./events-client.ts";

describe("fetchEvents", () => {
  test("GET /events?location_id= with encoded id", async () => {
    const captured: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      captured.push(typeof input === "string" ? input : input.toString());
      return new Response(
        JSON.stringify([
          {
            id: 1,
            location_id: 7,
            event_type: "test",
            created_at: "2026-01-01T00:00:00.000Z",
            body: null,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const rows = await fetchEvents("http://127.0.0.1:3000", { locationId: 7 }, fetchImpl);
    expect(captured[0]).toContain("/events");
    expect(captured[0]).toContain("location_id=7");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(1);
  });

  test("rejects invalid location_id", async () => {
    await expect(fetchEvents("http://x", { locationId: 1.5 }, mock())).rejects.toThrow();
    await expect(fetchEvents("http://x", { locationId: Number.NaN }, mock())).rejects.toThrow();
  });

  test("throws on non-array JSON", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({}), { status: 200 });
    await expect(fetchEvents("http://127.0.0.1:3000", { locationId: 1 }, fetchImpl)).rejects.toThrow(
      "JSON array",
    );
  });

  test("GET /events for all accessible locations sends x-user-id", async () => {
    const captured: Array<{ url: string; userHeader: string | null }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      captured.push({
        url: typeof input === "string" ? input : input.toString(),
        userHeader: new Headers(init?.headers).get("x-user-id"),
      });
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await fetchEvents("http://127.0.0.1:3000", { userId: 12 }, fetchImpl);
    expect(captured[0]?.url).toContain("/events");
    expect(captured[0]?.url).not.toContain("location_id=");
    expect(captured[0]?.userHeader).toBe("12");
  });
});
