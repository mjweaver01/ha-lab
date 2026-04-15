import { Database } from "bun:sqlite";
import { join } from "node:path";

export function resolveSqlitePath(): string {
  const fromEnv = process.env.SQLITE_PATH?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "data/home-assist.sqlite");
}

export function openDatabase(path?: string): Database {
  const target = path ?? resolveSqlitePath();
  const db = new Database(target, { create: true });
  db.run("PRAGMA foreign_keys = ON;");
  return db;
}
