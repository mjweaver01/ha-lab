import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEvents, type EventListItem } from "../api/events-client.ts";
import { markNewEventIds, maxEventId } from "../lib/new-events.ts";
import {
  readPublicLocationId,
  readPublicOrchestratorUrl,
  readPublicPollMs,
} from "../lib/public-env.ts";

export type UseEventsPollOptions = {
  baseUrl?: string;
  locationId?: number;
  pollMs?: number;
  userId?: number;
  includeAllLocations?: boolean;
};

export type UseEventsPollResult = {
  events: EventListItem[];
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  newIds: ReadonlySet<number>;
  locationId: number | null;
  pollMs: number;
};

export type UseEventsPollHook = (options?: UseEventsPollOptions) => UseEventsPollResult;

export function useEventsPoll(options: UseEventsPollOptions = {}): UseEventsPollResult {
  const baseUrl = options.baseUrl ?? readPublicOrchestratorUrl();
  const locationId =
    options.includeAllLocations === true
      ? null
      : (options.locationId ?? readPublicLocationId());
  const pollMs = options.pollMs ?? readPublicPollMs();

  const [events, setEvents] = useState<EventListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<number>>(() => new Set());

  const previousMaxRef = useRef<number | undefined>(undefined);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);

    try {
      const next = await fetchEvents(
        baseUrl,
        locationId != null
          ? { locationId, userId: options.userId }
          : { userId: options.userId },
      );
      const prevMax = previousMaxRef.current;
      const marked = markNewEventIds(prevMax, next);
      previousMaxRef.current = maxEventId(next);
      setEvents(next);
      setNewIds(marked);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [baseUrl, locationId, options.userId]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return {
    events,
    error,
    loading,
    onRefresh: () => {
      void refresh();
    },
    newIds,
    locationId,
    pollMs,
  };
}
