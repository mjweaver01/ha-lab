import type { Database } from "bun:sqlite";

export function createUser(
  db: Database,
  { displayName }: { displayName: string | null },
): number {
  const result = db.run("INSERT INTO users (display_name) VALUES ($displayName)", {
    $displayName: displayName,
  });
  return Number(result.lastInsertRowid);
}

export function createHome(db: Database, { name }: { name: string }): number {
  const result = db.run("INSERT INTO homes (name) VALUES ($name)", { $name: name });
  return Number(result.lastInsertRowid);
}

export function addUserToHome(
  db: Database,
  { homeId, userId }: { homeId: number; userId: number },
): void {
  db.run(
    "INSERT INTO home_members (home_id, user_id) VALUES ($homeId, $userId)",
    { $homeId: homeId, $userId: userId },
  );
}
