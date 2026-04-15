import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEvents, type EventListItem } from "../api/events-client.ts";
import { markNewEventIds, maxEventId } from "../lib/new-events.ts";
import {
  readPublicHomeId,
  readPublicOrchestratorUrl,
  readPublicPollMs,
} from "../lib/public-env.ts";

export function useEventsPoll(): {
  events: EventListItem[];
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  newIds: ReadonlySet<number>;
  homeId: number;
  pollMs: number;
} {
  const baseUrl = readPublicOrchestratorUrl();
  const homeId = readPublicHomeId();
  const pollMs = readPublicPollMs();

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
      const next = await fetchEvents(baseUrl, homeId);
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
  }, [baseUrl, homeId]);

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
    homeId,
    pollMs,
  };
}
