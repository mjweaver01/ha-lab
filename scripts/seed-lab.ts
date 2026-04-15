/**
 * Ensures at least one `homes` row exists so POST /events and the simulator work.
 * Idempotent: if a home named "Lab" (or id=1) already exists, no-op.
 */
import { openDatabase } from "../src/db/database.ts";
import { createHome, createUser, addUserToHome } from "../src/db/homes.ts";

function main(): void {
  const db = openDatabase();
  const existing = db
    .query("SELECT id FROM homes WHERE id = 1")
    .get() as { id: number } | null;
  if (existing != null) {
    console.log("Lab data OK: homes.id=1 already exists.");
    return;
  }

  const anyHome = db.query("SELECT id FROM homes LIMIT 1").get() as
    | { id: number }
    | null;
  if (anyHome != null) {
    console.log(
      `Found home id=${anyHome.id}. Use ORCHESTRATOR_URL=... bun run simulate -- --home ${anyHome.id}`,
    );
    return;
  }

  const userId = createUser(db, { displayName: "Lab user" });
  const homeId = createHome(db, { name: "Lab" });
  addUserToHome(db, { homeId, userId });
  console.log(`Seeded: homes.id=${homeId}, users.id=${userId}. Simulator default --home 1 works if homeId is 1.`);
}

main();
