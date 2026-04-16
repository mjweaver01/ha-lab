/**
 * Ensures at least one `locations` row exists so POST /events and the simulator work.
 * Idempotent: if a location with id=1 already exists, no-op.
 */
import { openDatabase } from "../src/db/database.ts";

function main(): void {
  const db = openDatabase();
  const existing = db
    .query("SELECT id FROM locations WHERE id = 1")
    .get() as { id: number } | null;
  if (existing != null) {
    console.log("Lab data OK: locations.id=1 already exists.");
    return;
  }

  const anyLocation = db.query("SELECT id FROM locations LIMIT 1").get() as
    | { id: number }
    | null;
  if (anyLocation != null) {
    console.log(
      `Found location id=${anyLocation.id}. Use ORCHESTRATOR_URL=... bun run simulate -- --location ${anyLocation.id}`,
    );
    return;
  }

  const userInsert = db.run("INSERT INTO users (display_name) VALUES ($name)", { $name: "Lab user" });
  const userId = Number(userInsert.lastInsertRowid);
  const locationInsert = db.run(
    "INSERT INTO locations (name, code, notes) VALUES ($name, $code, $notes)",
    {
      $name: "Lab",
      $code: "lab",
      $notes: "seeded",
    },
  );
  const locationId = Number(locationInsert.lastInsertRowid);
  db.run(
    "INSERT INTO location_members (location_id, user_id) VALUES ($locationId, $userId)",
    { $locationId: locationId, $userId: userId },
  );
  console.log(
    `Seeded: locations.id=${locationId}, users.id=${userId}. Simulator default --location 1 works if locationId is 1.`,
  );
}

main();
