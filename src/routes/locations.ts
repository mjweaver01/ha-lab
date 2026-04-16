import type { Database } from "bun:sqlite";
import {
  archiveLocation,
  createLocation,
  listLocationsForUser,
  restoreLocation,
  updateLocation,
} from "../db/locations.ts";
import type { CreateLocationBody, UpdateLocationBody } from "../types/locations-api.ts";

type LocationWritePayload = {
  name: string;
  code?: string;
  notes?: string;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseActorId(req: Request): number | null {
  const raw = req.headers.get("x-user-id");
  if (raw == null || raw.trim() === "") {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

function hasOnlyAllowedKeys(o: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(o).every((k) => keys.includes(k));
}

function parseLocationWritePayload(data: unknown): LocationWritePayload | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const o = data as Record<string, unknown>;
  if (!hasOnlyAllowedKeys(o, ["name", "code", "notes"])) {
    return null;
  }

  if (typeof o.name !== "string") {
    return null;
  }
  const name = o.name.trim();
  if (name === "") {
    return null;
  }

  const payload: LocationWritePayload = { name };

  if ("code" in o) {
    if (typeof o.code !== "string") {
      return null;
    }
    const code = o.code.trim();
    if (code !== "") {
      payload.code = code;
    }
  }

  if ("notes" in o) {
    if (typeof o.notes !== "string") {
      return null;
    }
    payload.notes = o.notes.trim();
  }

  return payload;
}

function parseArchiveReason(data: unknown): string | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const o = data as Record<string, unknown>;
  if (!hasOnlyAllowedKeys(o, ["reason"])) {
    return null;
  }
  if (!("reason" in o)) {
    return "";
  }
  if (typeof o.reason !== "string") {
    return null;
  }
  return o.reason.trim();
}

function parseLocationId(path: string): number | null {
  const match = /^\/locations\/(\d+)(?:\/(?:archive|restore))?$/.exec(path);
  if (!match) {
    return null;
  }
  const id = Number(match[1]);
  if (!Number.isInteger(id)) {
    return null;
  }
  return id;
}

export async function handleGetLocations(req: Request, db: Database): Promise<Response> {
  const actorId = parseActorId(req);
  if (actorId == null) {
    return json({ error: "invalid x-user-id" }, 400);
  }

  const includeArchivedRaw = new URL(req.url).searchParams.get("include_archived");
  let includeArchived = false;
  if (includeArchivedRaw != null) {
    if (includeArchivedRaw !== "0" && includeArchivedRaw !== "1") {
      return json({ error: "invalid include_archived" }, 400);
    }
    includeArchived = includeArchivedRaw === "1";
  }

  const rows = listLocationsForUser(db, {
    userId: actorId,
    includeArchived,
  });
  return json(rows);
}

export async function handlePostLocation(req: Request, db: Database): Promise<Response> {
  const actorId = parseActorId(req);
  if (actorId == null) {
    return json({ error: "invalid x-user-id" }, 400);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const parsed = parseLocationWritePayload(raw);
  if (!parsed) {
    return json({ error: "invalid body" }, 400);
  }

  const created = createLocation(db, {
    userId: actorId,
    body: parsed as CreateLocationBody,
  });
  return json(created, 201);
}

export async function handlePatchLocation(req: Request, db: Database): Promise<Response> {
  const actorId = parseActorId(req);
  if (actorId == null) {
    return json({ error: "invalid x-user-id" }, 400);
  }

  const locationId = parseLocationId(new URL(req.url).pathname);
  if (locationId == null) {
    return json({ error: "invalid location id" }, 400);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = parseLocationWritePayload(raw);
  if (!parsed) {
    return json({ error: "invalid body" }, 400);
  }

  const updated = updateLocation(db, {
    userId: actorId,
    locationId,
    body: parsed as UpdateLocationBody,
  });
  if (!updated) {
    return json({ error: "access denied" }, 403);
  }
  return json(updated);
}

export async function handleArchiveLocation(req: Request, db: Database): Promise<Response> {
  const actorId = parseActorId(req);
  if (actorId == null) {
    return json({ error: "invalid x-user-id" }, 400);
  }

  const locationId = parseLocationId(new URL(req.url).pathname);
  if (locationId == null) {
    return json({ error: "invalid location id" }, 400);
  }

  let reason: string | null = null;
  if (req.headers.get("content-length") !== null) {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return json({ error: "invalid JSON" }, 400);
    }
    const parsedReason = parseArchiveReason(raw);
    if (parsedReason === null) {
      return json({ error: "invalid body" }, 400);
    }
    reason = parsedReason;
  }

  const archived = archiveLocation(db, {
    userId: actorId,
    locationId,
    archiveReason: reason,
  });
  if (!archived) {
    return json({ error: "access denied" }, 403);
  }
  return json(archived);
}

export async function handleRestoreLocation(req: Request, db: Database): Promise<Response> {
  const actorId = parseActorId(req);
  if (actorId == null) {
    return json({ error: "invalid x-user-id" }, 400);
  }

  const locationId = parseLocationId(new URL(req.url).pathname);
  if (locationId == null) {
    return json({ error: "invalid location id" }, 400);
  }

  const restored = restoreLocation(db, {
    userId: actorId,
    locationId,
  });
  if (!restored) {
    return json({ error: "access denied" }, 403);
  }
  return json(restored);
}
