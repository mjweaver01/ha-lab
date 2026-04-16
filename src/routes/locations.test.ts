import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "../db/migrate.ts";
import { createServer } from "../server.ts";

type SeededContext = {
  base: string;
  stop: () => void;
  actorId: number;
  otherActorId: number;
  activeLocationId: number;
  archivedLocationId: number;
};

function jsonHeaders(actorId: number): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-user-id": String(actorId),
  };
}

function seedFixture(): SeededContext {
  const dir = mkdtempSync(join(tmpdir(), "home-assist-locations-"));
  const dbPath = join(dir, "app.sqlite");
  migrate(dbPath);
  const { server, url, db } = createServer({ port: 0, sqlitePath: dbPath });

  const actorId = Number(
    db.run("INSERT INTO users (display_name) VALUES ($name)", {
      $name: "Owner",
    }).lastInsertRowid,
  );
  const otherActorId = Number(
    db.run("INSERT INTO users (display_name) VALUES ($name)", {
      $name: "Other",
    }).lastInsertRowid,
  );

  const activeLocationId = Number(
    db.run(
      "INSERT INTO locations (name, code, notes) VALUES ($name, $code, $notes)",
      {
        $name: "HQ",
        $code: "hq",
        $notes: "active",
      },
    ).lastInsertRowid,
  );
  db.run(
    "INSERT INTO location_members (location_id, user_id) VALUES ($locationId, $userId)",
    { $locationId: activeLocationId, $userId: actorId },
  );

  const archivedLocationId = Number(
    db.run(
      `INSERT INTO locations (name, code, notes, archived_at)
       VALUES ($name, $code, $notes, datetime('now'))`,
      {
        $name: "Archive",
        $code: "archive",
        $notes: "archived",
      },
    ).lastInsertRowid,
  );
  db.run(
    "INSERT INTO location_members (location_id, user_id) VALUES ($locationId, $userId)",
    { $locationId: archivedLocationId, $userId: actorId },
  );

  return {
    base: url.origin,
    stop: () => {
      server.stop();
      db.close();
    },
    actorId,
    otherActorId,
    activeLocationId,
    archivedLocationId,
  };
}

describe("locations routes", () => {
  test("default active list", async () => {
    const fx = seedFixture();
    try {
      const res = await fetch(`${fx.base}/locations`, {
        headers: { "x-user-id": String(fx.actorId) },
      });
      expect(res.status).toBe(200);
      const rows = (await res.json()) as Array<{ id: number }>;
      expect(rows.map((r) => r.id)).toContain(fx.activeLocationId);
      expect(rows.map((r) => r.id)).not.toContain(fx.archivedLocationId);
    } finally {
      fx.stop();
    }
  });

  test("include archived", async () => {
    const fx = seedFixture();
    try {
      const res = await fetch(`${fx.base}/locations?include_archived=1`, {
        headers: { "x-user-id": String(fx.actorId) },
      });
      expect(res.status).toBe(200);
      const rows = (await res.json()) as Array<{ id: number }>;
      expect(rows.map((r) => r.id)).toContain(fx.activeLocationId);
      expect(rows.map((r) => r.id)).toContain(fx.archivedLocationId);
    } finally {
      fx.stop();
    }
  });

  test("create location", async () => {
    const fx = seedFixture();
    try {
      const res = await fetch(`${fx.base}/locations`, {
        method: "POST",
        headers: jsonHeaders(fx.actorId),
        body: JSON.stringify({
          name: "New Lab",
          code: "new-lab",
          notes: "created",
        }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { id: number; name: string; code: string | null };
      expect(body.name).toBe("New Lab");
      expect(body.code).toBe("new-lab");
      expect(typeof body.id).toBe("number");
    } finally {
      fx.stop();
    }
  });

  test("edit location", async () => {
    const fx = seedFixture();
    try {
      const res = await fetch(`${fx.base}/locations/${fx.activeLocationId}`, {
        method: "PATCH",
        headers: jsonHeaders(fx.actorId),
        body: JSON.stringify({
          name: "HQ Updated",
          code: "hq-updated",
          notes: "updated",
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { name: string; code: string | null };
      expect(body.name).toBe("HQ Updated");
      expect(body.code).toBe("hq-updated");
    } finally {
      fx.stop();
    }
  });

  test("archive location", async () => {
    const fx = seedFixture();
    try {
      const res = await fetch(`${fx.base}/locations/${fx.activeLocationId}/archive`, {
        method: "POST",
        headers: jsonHeaders(fx.actorId),
        body: JSON.stringify({ reason: "maintenance" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { archived_at: string | null };
      expect(body.archived_at).not.toBeNull();

      const verify = await fetch(`${fx.base}/locations?include_archived=1`, {
        headers: { "x-user-id": String(fx.actorId) },
      });
      const rows = (await verify.json()) as Array<{
        id: number;
        archived_at: string | null;
      }>;
      const row = rows.find((item) => item.id === fx.activeLocationId);
      expect(row).toBeDefined();
      expect(row?.archived_at).not.toBeNull();
    } finally {
      fx.stop();
    }
  });

  test("restore location", async () => {
    const fx = seedFixture();
    try {
      const res = await fetch(`${fx.base}/locations/${fx.archivedLocationId}/restore`, {
        method: "POST",
        headers: { "x-user-id": String(fx.actorId) },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { archived_at: string | null };
      expect(body.archived_at).toBeNull();
    } finally {
      fx.stop();
    }
  });

  test("access denied", async () => {
    const fx = seedFixture();
    try {
      const listRes = await fetch(`${fx.base}/locations?include_archived=1`, {
        headers: { "x-user-id": String(fx.otherActorId) },
      });
      expect(listRes.status).toBe(200);
      const listRows = (await listRes.json()) as Array<{ id: number }>;
      expect(listRows.map((r) => r.id)).not.toContain(fx.activeLocationId);
      expect(listRows.map((r) => r.id)).not.toContain(fx.archivedLocationId);

      const patchRes = await fetch(`${fx.base}/locations/${fx.activeLocationId}`, {
        method: "PATCH",
        headers: jsonHeaders(fx.otherActorId),
        body: JSON.stringify({
          name: "No Access",
          code: "no-access",
          notes: "blocked",
        }),
      });
      expect(patchRes.status).toBe(403);
      expect(await patchRes.json()).toEqual({ error: "access denied" });

      const archiveRes = await fetch(`${fx.base}/locations/${fx.activeLocationId}/archive`, {
        method: "POST",
        headers: jsonHeaders(fx.otherActorId),
        body: JSON.stringify({ reason: "forbidden" }),
      });
      expect(archiveRes.status).toBe(403);
      expect(await archiveRes.json()).toEqual({ error: "access denied" });
    } finally {
      fx.stop();
    }
  });
});
