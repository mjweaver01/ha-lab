import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { migrate } from "./migrate.ts";
import { openDatabase } from "./database.ts";
import { addUserToHome, createHome, createUser } from "./homes.ts";

describe("migrate + homes integration", () => {
  test("home and membership survive db reopen on file path", () => {
    const dir = mkdtempSync(join(tmpdir(), "home-assist-test-"));
    const dbPath = join(dir, "persist.sqlite");

    migrate(dbPath);

    let homeId: number;
    let userId: number;
    {
      const db = openDatabase(dbPath);
      homeId = createHome(db, { name: "Lab" });
      userId = createUser(db, { displayName: "Dev" });
      expect(typeof homeId).toBe("number");
      expect(homeId).toBeGreaterThan(0);
      expect(typeof userId).toBe("number");
      expect(userId).toBeGreaterThan(0);
      addUserToHome(db, { homeId, userId });
      db.close();
    }

    const db2 = openDatabase(dbPath);
    const row = db2
      .query(
        `SELECT h.name AS home_name, u.display_name
         FROM home_members hm
         JOIN homes h ON h.id = hm.home_id
         JOIN users u ON u.id = hm.user_id
         WHERE hm.home_id = ? AND hm.user_id = ?`,
      )
      .get(homeId, userId) as { home_name: string; display_name: string | null } | null;
    expect(row).not.toBeNull();
    expect(row?.home_name).toBe("Lab");
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

  test("duplicate membership rejected (UNIQUE / PK)", () => {
    const dir = mkdtempSync(join(tmpdir(), "home-assist-test-"));
    const dbPath = join(dir, "dup.sqlite");
    migrate(dbPath);
    const db = openDatabase(dbPath);
    const homeId = createHome(db, { name: "H" });
    const userId = createUser(db, { displayName: null });
    addUserToHome(db, { homeId, userId });
    expect(() => addUserToHome(db, { homeId, userId })).toThrow();
    db.close();
  });

  test("FK enforcement: invalid home_id fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "home-assist-test-"));
    const dbPath = join(dir, "fk.sqlite");
    migrate(dbPath);
    const db = openDatabase(dbPath);
    const userId = createUser(db, { displayName: "x" });
    expect(() => addUserToHome(db, { homeId: 99_999, userId })).toThrow();
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
