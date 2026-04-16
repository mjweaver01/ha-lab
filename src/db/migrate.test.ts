import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { migrate } from "./migrate.ts";
import { openDatabase } from "./database.ts";

function createUser(dbPath: ReturnType<typeof openDatabase>, displayName: string | null): number {
  const result = dbPath.run("INSERT INTO users (display_name) VALUES ($displayName)", {
    $displayName: displayName,
  });
  return Number(result.lastInsertRowid);
}

describe("migrate + locations integration", () => {
  test("location and membership survive db reopen on file path", () => {
    const dir = mkdtempSync(join(tmpdir(), "home-assist-test-"));
    const dbPath = join(dir, "persist.sqlite");

    migrate(dbPath);

    let locationId: number;
    let userId: number;
    {
      const db = openDatabase(dbPath);
      locationId = Number(
        db.run("INSERT INTO locations (name, code) VALUES ($name, $code)", {
          $name: "Lab",
          $code: "lab",
        }).lastInsertRowid,
      );
      userId = createUser(db, "Dev");
      expect(typeof locationId).toBe("number");
      expect(locationId).toBeGreaterThan(0);
      expect(typeof userId).toBe("number");
      expect(userId).toBeGreaterThan(0);
      db.run(
        "INSERT INTO location_members (location_id, user_id) VALUES ($locationId, $userId)",
        { $locationId: locationId, $userId: userId },
      );
      db.close();
    }

    const db2 = openDatabase(dbPath);
    const row = db2
      .query(
        `SELECT l.name AS location_name, u.display_name
         FROM location_members lm
         JOIN locations l ON l.id = lm.location_id
         JOIN users u ON u.id = lm.user_id
         WHERE lm.location_id = ? AND lm.user_id = ?`,
      )
      .get(locationId, userId) as { location_name: string; display_name: string | null } | null;
    expect(row).not.toBeNull();
    expect(row?.location_name).toBe("Lab");
    expect(row?.display_name).toBe("Dev");
    db2.close();
  });

  test("applies all migrations once", () => {
    const dir = mkdtempSync(join(tmpdir(), "home-assist-test-"));
    const dbPath = join(dir, "idempotent.sqlite");
    migrate(dbPath);
    const c1 = new Database(dbPath);
    c1.run("PRAGMA foreign_keys = ON;");
    const n1 = (c1.query("SELECT COUNT(*) AS c FROM schema_migrations").get() as { c: number })
      .c;
    c1.close();
    migrate(dbPath);
    const c2 = new Database(dbPath);
    c2.run("PRAGMA foreign_keys = ON;");
    const n2 = (c2.query("SELECT COUNT(*) AS c FROM schema_migrations").get() as { c: number })
      .c;
    c2.close();
    expect(n1).toBe(n2);
  });

  test("duplicate location membership rejected (UNIQUE / PK)", () => {
    const dir = mkdtempSync(join(tmpdir(), "home-assist-test-"));
    const dbPath = join(dir, "dup.sqlite");
    migrate(dbPath);
    const db = openDatabase(dbPath);
    const locationId = Number(
      db.run("INSERT INTO locations (name, code) VALUES ($name, $code)", {
        $name: "H",
        $code: "h",
      }).lastInsertRowid,
    );
    const userId = createUser(db, null);
    db.run(
      "INSERT INTO location_members (location_id, user_id) VALUES ($locationId, $userId)",
      { $locationId: locationId, $userId: userId },
    );
    expect(() =>
      db.run(
        "INSERT INTO location_members (location_id, user_id) VALUES ($locationId, $userId)",
        { $locationId: locationId, $userId: userId },
      ),
    ).toThrow();
    db.close();
  });

  test("FK enforcement: invalid location_id fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "home-assist-test-"));
    const dbPath = join(dir, "fk.sqlite");
    migrate(dbPath);
    const db = openDatabase(dbPath);
    const userId = createUser(db, "x");
    expect(() =>
      db.run(
        "INSERT INTO location_members (location_id, user_id) VALUES ($locationId, $userId)",
        { $locationId: 99_999, $userId: userId },
      ),
    ).toThrow();
    db.close();
  });

  test("schema_migrations records 001_initial.sql", () => {
    const dir = mkdtempSync(join(tmpdir(), "home-assist-test-"));
    const dbPath = join(dir, "ver.sqlite");
    migrate(dbPath);
    const db = openDatabase(dbPath);
    const row = db
      .query("SELECT version FROM schema_migrations WHERE version = $v")
      .get({ $v: "001_initial.sql" }) as { version: string } | null;
    expect(row?.version).toBe("001_initial.sql");
    db.close();
  });

  test("schema_migrations records 002_events_subscribers.sql", () => {
    const dir = mkdtempSync(join(tmpdir(), "home-assist-test-"));
    const dbPath = join(dir, "ver2.sqlite");
    migrate(dbPath);
    const db = openDatabase(dbPath);
    const row = db
      .query("SELECT version FROM schema_migrations WHERE version = $v")
      .get({ $v: "002_events_subscribers.sql" }) as { version: string } | null;
    expect(row?.version).toBe("002_events_subscribers.sql");
    const tables = db
      .query(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('events','subscribers','event_deliveries') ORDER BY name",
      )
      .all() as { name: string }[];
    expect(tables.map((r) => r.name)).toEqual(["event_deliveries", "events", "subscribers"]);
    db.close();
  });
});
