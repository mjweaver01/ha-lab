import { describe, expect, test, afterEach } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { migrate } from "../db/migrate.ts";
import { openDatabase } from "../db/database.ts";
import { createHome } from "../db/homes.ts";
import { deliverEventToSubscribers } from "./fan-out.ts";

describe("deliverEventToSubscribers", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("two subscribers: two fetch calls and two event_deliveries rows", async () => {
    const dir = mkdtempSync(join(tmpdir(), "home-assist-fanout-"));
    const dbPath = join(dir, "t.sqlite");
    migrate(dbPath);
    const db = openDatabase(dbPath);

    const homeId = createHome(db, { name: "H" });
    db.run("INSERT INTO subscribers (home_id, callback_url) VALUES ($h, $u)", {
      $h: homeId,
      $u: "http://127.0.0.1:9/a",
    });
    db.run("INSERT INTO subscribers (home_id, callback_url) VALUES ($h, $u)", {
      $h: homeId,
      $u: "http://127.0.0.1:9/b",
    });

    const ins = db.run(
      "INSERT INTO events (home_id, event_type, body) VALUES ($h, $t, $b)",
      {
        $h: homeId,
        $t: "test.event",
        $b: JSON.stringify({ n: 1 }),
      },
    );
    const eventId = Number(ins.lastInsertRowid);

    let fetchCount = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCount++;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    await deliverEventToSubscribers(db, {
      id: eventId,
      home_id: homeId,
      event_type: "test.event",
      body: JSON.stringify({ n: 1 }),
    });

    expect(fetchCount).toBe(2);
    const rows = db
      .query(
        "SELECT COUNT(*) AS c FROM event_deliveries WHERE event_id = $eid",
      )
      .get({ $eid: eventId }) as { c: number };
    expect(rows.c).toBe(2);
    db.close();
  });
});
