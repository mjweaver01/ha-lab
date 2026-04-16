import type { Database } from "bun:sqlite";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handlePostSubscriber(req: Request, db: Database): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  if (typeof raw !== "object" || raw === null) {
    return json({ error: "invalid body" }, 400);
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.location_id !== "number" || !Number.isInteger(o.location_id)) {
    return json({ error: "invalid location_id" }, 400);
  }
  if (typeof o.callback_url !== "string" || o.callback_url.trim() === "") {
    return json({ error: "invalid callback_url" }, 400);
  }
  try {
    new URL(o.callback_url);
  } catch {
    return json({ error: "invalid callback_url" }, 400);
  }

  const location = db
    .query("SELECT 1 AS ok FROM locations WHERE id = ?")
    .get(o.location_id) as { ok: number } | null;
  if (!location) {
    return json({ error: "location not found" }, 404);
  }

  const ins = db.run(
    "INSERT INTO subscribers (location_id, callback_url) VALUES (?, ?)",
    [o.location_id, o.callback_url],
  );
  return json({ id: Number(ins.lastInsertRowid) }, 201);
}
