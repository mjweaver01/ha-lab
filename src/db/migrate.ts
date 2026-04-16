import { Database } from "bun:sqlite";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { resolveSqlitePath } from "./database.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MIGRATIONS_DIR = join(__dirname, "migrations");

/** Versioned SQL files in `migrations/` are applied in sorted order (e.g. `001_initial.sql`, `002_events_subscribers.sql`). */

function hasMigrationsTable(db: Database): boolean {
  const row = db
    .query(
      "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'",
    )
    .get() as { ok: number } | null;
  return row != null;
}

function isVersionApplied(db: Database, version: string): boolean {
  if (!hasMigrationsTable(db)) return false;
  const row = db
    .query("SELECT 1 AS ok FROM schema_migrations WHERE version = ?")
    .get(version) as { ok: number } | null;
  return row != null;
}

export function migrate(dbFilePath: string): void {
  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory missing: ${MIGRATIONS_DIR}`);
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`No .sql files in ${MIGRATIONS_DIR}`);
  }

  const db = new Database(dbFilePath, { create: true });
  db.run("PRAGMA foreign_keys = ON;");

  try {
    for (const file of files) {
      const version = file;
      if (isVersionApplied(db, version)) continue;

      const fullPath = join(MIGRATIONS_DIR, file);
      const sql = readFileSync(fullPath, "utf-8");

      const run = db.transaction(() => {
        db.run(sql);
        db.run("INSERT INTO schema_migrations (version) VALUES (?)", [version]);
      });
      run();
    }
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  const path = resolveSqlitePath();
  mkdirSync(dirname(path), { recursive: true });
  migrate(path);
}
