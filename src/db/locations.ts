import type { Database } from "bun:sqlite";
import type {
  CreateLocationBody,
  LocationListItem,
  UpdateLocationBody,
} from "../types/locations-api.ts";

type LocationRow = {
  id: number;
  name: string;
  code: string | null;
  notes: string | null;
  archived_at: string | null;
  updated_at: string;
};

type LocationMutationInput = {
  userId: number;
  locationId: number;
  body?: UpdateLocationBody;
  archiveReason?: string | null;
};

function toLocationListItem(row: LocationRow): LocationListItem {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    notes: row.notes,
    archived_at: row.archived_at,
    updated_at: row.updated_at,
  };
}

function getLocationForUser(
  db: Database,
  params: { userId: number; locationId: number },
): LocationListItem | null {
  const row = db
    .query(
      `SELECT l.id, l.name, l.code, l.notes, l.archived_at, l.updated_at
       FROM locations l
       JOIN location_members lm ON lm.location_id = l.id
       WHERE l.id = $locationId AND lm.user_id = $userId`,
    )
    .get({ $locationId: params.locationId, $userId: params.userId }) as
    | LocationRow
    | null;

  return row ? toLocationListItem(row) : null;
}

export function listLocationsForUser(
  db: Database,
  params: { userId: number; includeArchived?: boolean },
): LocationListItem[] {
  const includeArchived = params.includeArchived === true ? 1 : 0;

  const rows = db
    .query(
      `SELECT l.id, l.name, l.code, l.notes, l.archived_at, l.updated_at
       FROM locations l
       JOIN location_members lm ON lm.location_id = l.id
       WHERE lm.user_id = $userId
         AND ($includeArchived = 1 OR l.archived_at IS NULL)
       ORDER BY l.updated_at DESC, l.id DESC`,
    )
    .all({ $userId: params.userId, $includeArchived: includeArchived }) as LocationRow[];

  return rows.map(toLocationListItem);
}

export function createLocation(
  db: Database,
  params: { userId: number; body: CreateLocationBody },
): LocationListItem {
  const tx = db.transaction(() => {
    const ins = db.run(
      `INSERT INTO locations (name, code, notes, updated_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [params.body.name, params.body.code ?? null, params.body.notes ?? null],
    );
    const locationId = Number(ins.lastInsertRowid);

    db.run(
      `INSERT INTO location_members (location_id, user_id)
       VALUES (?, ?)`,
      [locationId, params.userId],
    );

    return getLocationForUser(db, { userId: params.userId, locationId });
  });

  const created = tx();
  if (!created) {
    throw new Error("location create failed");
  }
  return created;
}

export function updateLocation(
  db: Database,
  params: LocationMutationInput & { body: UpdateLocationBody },
): LocationListItem | null {
  const run = db.run(
    `UPDATE locations
     SET name = ?,
         code = ?,
         notes = ?,
         updated_at = datetime('now')
     WHERE id = ?
       AND EXISTS (
         SELECT 1 FROM location_members lm
         WHERE lm.location_id = locations.id
           AND lm.user_id = ?
       )`,
    [
      params.body.name,
      params.body.code ?? null,
      params.body.notes ?? null,
      params.locationId,
      params.userId,
    ],
  );

  if (run.changes === 0) {
    return null;
  }

  return getLocationForUser(db, {
    userId: params.userId,
    locationId: params.locationId,
  });
}

export function archiveLocation(
  db: Database,
  params: LocationMutationInput,
): LocationListItem | null {
  const run = db.run(
    `UPDATE locations
     SET archived_at = datetime('now'),
         archived_by = ?,
         archive_reason = ?,
         updated_at = datetime('now')
     WHERE id = ?
       AND archived_at IS NULL
       AND EXISTS (
         SELECT 1 FROM location_members lm
         WHERE lm.location_id = locations.id
           AND lm.user_id = ?
       )`,
    [
      params.userId,
      params.archiveReason ?? null,
      params.locationId,
      params.userId,
    ],
  );

  if (run.changes === 0) {
    return null;
  }

  return getLocationForUser(db, {
    userId: params.userId,
    locationId: params.locationId,
  });
}

export function restoreLocation(
  db: Database,
  params: LocationMutationInput,
): LocationListItem | null {
  const run = db.run(
    `UPDATE locations
     SET archived_at = NULL,
         archived_by = NULL,
         archive_reason = NULL,
         updated_at = datetime('now')
     WHERE id = ?
       AND archived_at IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM location_members lm
         WHERE lm.location_id = locations.id
           AND lm.user_id = ?
       )`,
    [params.locationId, params.userId],
  );

  if (run.changes === 0) {
    return null;
  }

  return getLocationForUser(db, {
    userId: params.userId,
    locationId: params.locationId,
  });
}
