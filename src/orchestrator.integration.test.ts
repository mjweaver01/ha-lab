import { describe, expect, test, afterEach } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { migrate } from "./db/migrate.ts";
import { createHome } from "./db/homes.ts";
import { createServer } from "./server.ts";

describe("orchestrator HTTP (HOOK-01–HOOK-04)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("POST /events, GET /events, subscribers, mocked fan-out", async () => {
    const dir = mkdtempSync(join(tmpdir(), "home-assist-integ-"));
    const dbPath = join(dir, "app.sqlite");
    migrate(dbPath);

    const { server, url, db } = createServer({ port: 0, sqlitePath: dbPath });
    const base = url.origin;

    try {
      const homeId = createHome(db, { name: "Lab" });

      const preflight = await fetch(`${base}/events`, {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3001",
          "Access-Control-Request-Method": "POST",
        },
      });
      expect(preflight.status).toBe(204);
      const allowMethods = preflight.headers.get("Access-Control-Allow-Methods");
      expect(allowMethods).toContain("POST");

      const s1 = await fetch(`${base}/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_id: homeId,
          callback_url: "http://127.0.0.1:9/a",
        }),
      });
      expect(s1.status).toBe(201);

      const s2 = await fetch(`${base}/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_id: homeId,
          callback_url: "http://127.0.0.1:9/b",
        }),
      });
      expect(s2.status).toBe(201);

      let fetchCalls = 0;
      globalThis.fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        const href =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (href.startsWith(base)) {
          return originalFetch(input, init);
        }
        fetchCalls++;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }) as typeof fetch;

      const ev = await fetch(`${base}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3001",
        },
        body: JSON.stringify({
          home_id: homeId,
          event_type: "motion.detected",
          body: { room: "hall" },
        }),
      });
      expect(ev.status).toBe(201);
      expect(ev.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(ev.headers.get("Access-Control-Allow-Methods")).toContain("POST");
      const created = (await ev.json()) as { id: number };
      expect(typeof created.id).toBe("number");

      expect(fetchCalls).toBe(2);

      const rows = db
        .query(
          "SELECT COUNT(*) AS c FROM event_deliveries WHERE event_id = $eid",
        )
        .get({ $eid: created.id }) as { c: number };
      expect(rows.c).toBe(2);

      const list = await fetch(
        `${base}/events?home_id=${encodeURIComponent(String(homeId))}`,
      );
      expect(list.status).toBe(200);
      const arr = (await list.json()) as Array<{ id: number; event_type: string }>;
      expect(arr.some((e) => e.id === created.id)).toBe(true);
    } finally {
      server.stop();
      db.close();
    }
  });
});
