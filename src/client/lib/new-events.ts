import type { EventListItem } from "../api/events-client.ts";


export function maxEventId(events: EventListItem[]): number | undefined {
  if (events.length === 0) return undefined;
  return Math.max(...events.map((e) => e.id));
}

/**
 * IDs strictly greater than `previousMax` are considered "new" for this poll.
 * When `previousMax` is undefined (first snapshot), returns an empty set so the first load does not highlight everything.
 */
export function markNewEventIds(
  previousMax: number | undefined,
  events: EventListItem[],
): Set<number> {
  const next = new Set<number>();
  const floor = previousMax ?? Number.POSITIVE_INFINITY;
  for (const e of events) {
    if (e.id > floor) {
      next.add(e.id);
    }
  }
  return next;
}
