import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "../db/migrate.ts";
import { createServer } from "../server.ts";

type AnalyticsFixture = {
  base: string;
  stop: () => void;
  actorId: number;
  outsiderId: number;
  locationId: number;
  otherLocationId: number;
};

function seedAnalyticsFixture(): AnalyticsFixture {
  const dir = mkdtempSync(join(tmpdir(), "home-assist-analytics-"));
  const dbPath = join(dir, "app.sqlite");
  migrate(dbPath);
  const { server, url, db } = createServer({ port: 0, sqlitePath: dbPath });

  const actorId = Number(
    db.run("INSERT INTO users (display_name) VALUES (?)", ["Analyst"]).lastInsertRowid,
  );
  const outsiderId = Number(
    db.run("INSERT INTO users (display_name) VALUES (?)", ["Outsider"]).lastInsertRowid,
  );

  const locationId = Number(
    db.run(
      "INSERT INTO locations (name, code, notes) VALUES (?, ?, ?)",
      ["HQ", "hq", "analytics"],
    ).lastInsertRowid,
  );
  const otherLocationId = Number(
    db.run(
      "INSERT INTO locations (name, code, notes) VALUES (?, ?, ?)",
      ["Remote", "remote", "other"],
    ).lastInsertRowid,
  );
  db.run("INSERT INTO location_members (location_id, user_id) VALUES (?, ?)", [
    locationId,
    actorId,
  ]);

  db.run(
    `INSERT INTO events (location_id, event_type, body, created_at) VALUES
      (?, 'media.detected', '{"confidence":0.9}', datetime('now', '-10 minutes')),
      (?, 'media.detected', '{"match_score":0.7}', datetime('now', '-5 minutes')),
      (?, 'media.audio', '{"top_label":"speech"}', datetime('now', '-20 minutes')),
      (?, 'media.video', '{"top_label":"person"}', datetime('now', '-20 minutes'))`,
    [locationId, locationId, locationId, otherLocationId],
  );

  return {
    base: url.origin,
    stop: () => {
      server.stop();
      db.close();
    },
    actorId,
    outsiderId,
    locationId,
    otherLocationId,
  };
}

describe("GET /events/analytics", () => {
  test("returns aggregate sections for valid request", async () => {
    const fx = seedAnalyticsFixture();
    try {
      const res = await fetch(`${fx.base}/events/analytics?range=1h&bucket=15m`, {
        headers: { "x-user-id": String(fx.actorId) },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        volumeTrend: Array<{ event_count: number }>;
        eventTypeDistribution: Array<{ event_type: string; percent: number }>;
        confidenceTrend: Array<{ average_confidence: number }>;
        totals: { events: number; confidenceSamples: number; distinctEventTypes: number };
      };
      expect(body.volumeTrend.length).toBeGreaterThan(0);
      expect(body.eventTypeDistribution.length).toBeGreaterThan(0);
      expect(body.totals.events).toBe(3);
      expect(body.totals.distinctEventTypes).toBe(2);
      expect(body.totals.confidenceSamples).toBe(2);
      expect(body.confidenceTrend[0]?.average_confidence).toBeGreaterThan(0);
      expect(body.eventTypeDistribution.reduce((acc, row) => acc + row.percent, 0)).toBeCloseTo(100, 2);
    } finally {
      fx.stop();
    }
  });

  test("rejects invalid bucket", async () => {
    const fx = seedAnalyticsFixture();
    try {
      const res = await fetch(`${fx.base}/events/analytics?range=1h&bucket=2m`, {
        headers: { "x-user-id": String(fx.actorId) },
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid bucket" });
    } finally {
      fx.stop();
    }
  });

  test("requires x-user-id", async () => {
    const fx = seedAnalyticsFixture();
    try {
      const res = await fetch(`${fx.base}/events/analytics?range=1h&bucket=15m`);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "x-user-id required" });
    } finally {
      fx.stop();
    }
  });

  test("denies unauthorized location scope", async () => {
    const fx = seedAnalyticsFixture();
    try {
      const res = await fetch(
        `${fx.base}/events/analytics?range=1h&bucket=15m&location_id=${fx.locationId}`,
        {
          headers: { "x-user-id": String(fx.outsiderId) },
        },
      );
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "access denied" });
    } finally {
      fx.stop();
    }
  });
});
