import type { Database } from "bun:sqlite";
import type { PostEventBody } from "../types/events-api.ts";
import { deliverEventToSubscribers } from "../webhooks/fan-out.ts";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parsePostEventBody(data: unknown): PostEventBody | null {
  if (typeof data !== "object" || data === null) return null;
  const o = data as Record<string, unknown>;
  if (typeof o.location_id !== "number" || !Number.isInteger(o.location_id)) return null;
  if (typeof o.event_type !== "string" || o.event_type.trim() === "") return null;
  const out: PostEventBody = {
    location_id: o.location_id,
    event_type: o.event_type,
  };
  if ("body" in o) {
    out.body = o.body as unknown;
  }
  return out;
}

export async function handlePostEvent(req: Request, db: Database): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = parsePostEventBody(raw);
  if (!parsed) {
    return json({ error: "invalid body" }, 400);
  }

  const location = db
    .query("SELECT 1 AS ok FROM locations WHERE id = $id")
    .get({ $id: parsed.location_id }) as { ok: number } | null;
  if (!location) {
    return json({ error: "location not found" }, 404);
  }

  const bodyStr = parsed.body !== undefined ? JSON.stringify(parsed.body) : null;
  const ins = db.run(
    "INSERT INTO events (location_id, event_type, body) VALUES ($l, $t, $b)",
    {
      $l: parsed.location_id,
      $t: parsed.event_type,
      $b: bodyStr,
    },
  );
  const id = Number(ins.lastInsertRowid);
  const row = db
    .query(
      "SELECT id, location_id, event_type, body FROM events WHERE id = $id",
    )
    .get({ $id: id }) as {
      id: number;
      location_id: number;
      event_type: string;
      body: string | null;
    };

  await deliverEventToSubscribers(db, row);

  return json(
    {
      id: row.id,
      location_id: row.location_id,
      event_type: row.event_type,
      body: parsed.body,
    },
    201,
  );
}

export async function handleGetEvents(req: Request, db: Database): Promise<Response> {
  const u = new URL(req.url);
  const lid = u.searchParams.get("location_id");
  if (lid == null || lid === "") {
    return json({ error: "location_id required" }, 400);
  }
  const locationId = Number(lid);
  if (!Number.isInteger(locationId)) {
    return json({ error: "invalid location_id" }, 400);
  }

  const rows = db
    .query(
      `SELECT id, location_id, event_type, body, created_at
       FROM events WHERE location_id = $l ORDER BY id DESC`,
    )
    .all({ $l: locationId }) as Array<{
      id: number;
      location_id: number;
      event_type: string;
      body: string | null;
      created_at: string;
    }>;

  const out = rows.map((r) => ({
    id: r.id,
    location_id: r.location_id,
    event_type: r.event_type,
    created_at: r.created_at,
    body: r.body != null ? (JSON.parse(r.body) as unknown) : null,
  }));
  return json(out);
}
