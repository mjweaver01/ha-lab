import type { Database } from "bun:sqlite";

/** Row from `events` after insert/select — used for webhook payload and fan-out. */
export type EventRow = {
  id: number;
  location_id: number;
  event_type: string;
  body: string | null;
};

/**
 * POST JSON to each subscriber for `location_id`, record outcomes in `event_deliveries`.
 * Await `Promise.allSettled` so one bad callback does not block others.
 */
export async function deliverEventToSubscribers(
  db: Database,
  event: EventRow,
): Promise<void> {
  const subs = db
    .query(
      "SELECT id, callback_url FROM subscribers WHERE location_id = $locationId",
    )
    .all({ $locationId: event.location_id }) as { id: number; callback_url: string }[];

  let payload: Record<string, unknown>;
  try {
    payload = {
      event_id: event.id,
      location_id: event.location_id,
      event_type: event.event_type,
      body: event.body != null ? JSON.parse(event.body) : undefined,
    };
  } catch {
    payload = {
      event_id: event.id,
      location_id: event.location_id,
      event_type: event.event_type,
      body: event.body,
    };
  }

  const bodyStr = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        const res = await fetch(sub.callback_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyStr,
        });
        const httpStatus = res.status;
        const ok = res.ok;
        let errorText: string | null = null;
        if (!ok) {
          errorText = (await res.text().catch(() => "")).slice(0, 2000);
        }
        db.run(
          `INSERT INTO event_deliveries (event_id, subscriber_id, status, http_status, error_text)
           VALUES ($eid, $sid, $status, $http, $err)`,
          {
            $eid: event.id,
            $sid: sub.id,
            $status: ok ? "succeeded" : "failed",
            $http: httpStatus,
            $err: errorText,
          },
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        db.run(
          `INSERT INTO event_deliveries (event_id, subscriber_id, status, http_status, error_text)
           VALUES ($eid, $sid, $status, $http, $err)`,
          {
            $eid: event.id,
            $sid: sub.id,
            $status: "failed",
            $http: null,
            $err: msg,
          },
        );
      }
    }),
  );
}
