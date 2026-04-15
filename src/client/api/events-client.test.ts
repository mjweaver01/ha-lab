import { describe, expect, mock, test } from "bun:test";
import { fetchEvents } from "./events-client.ts";

describe("fetchEvents", () => {
  test("GET /events?home_id= with encoded id", async () => {
    const captured: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      captured.push(typeof input === "string" ? input : input.toString());
      return new Response(
        JSON.stringify([
          {
            id: 1,
            home_id: 7,
            event_type: "test",
            created_at: "2026-01-01T00:00:00.000Z",
            body: null,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const rows = await fetchEvents("http://127.0.0.1:3000", 7, fetchImpl);
    expect(captured[0]).toContain("/events");
    expect(captured[0]).toContain("home_id=7");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(1);
  });

  test("rejects invalid home_id", async () => {
    await expect(fetchEvents("http://x", 1.5, mock())).rejects.toThrow();
    await expect(fetchEvents("http://x", Number.NaN, mock())).rejects.toThrow();
  });

  test("throws on non-array JSON", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({}), { status: 200 });
    await expect(fetchEvents("http://127.0.0.1:3000", 1, fetchImpl)).rejects.toThrow(
      "JSON array",
    );
  });
});
