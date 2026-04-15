import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEvents, type EventListItem } from "../api/events-client.ts";
import { markNewEventIds, maxEventId } from "../lib/new-events.ts";

/** Default poll interval — within UI-SPEC 3–5s; override with `PUBLIC_POLL_MS` (milliseconds). */
const DEFAULT_POLL_MS = 4000;

function readOrchestratorBase(): string {
  const v = process.env.PUBLIC_ORCHESTRATOR_URL;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : "http://127.0.0.1:3000";
}

function readHomeId(): number {
  const raw = process.env.PUBLIC_HOME_ID;
  if (raw === undefined || raw === "") return 1;
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return 1;
  }
  return n;
}

function readPollMs(): number {
  const raw = process.env.PUBLIC_POLL_MS;
  if (raw === undefined || raw === "") return DEFAULT_POLL_MS;
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1000) return DEFAULT_POLL_MS;
  return n;
}

export function useEventsPoll(): {
  events: EventListItem[];
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  newIds: ReadonlySet<number>;
  homeId: number;
  pollMs: number;
} {
  const baseUrl = readOrchestratorBase();
  const homeId = readHomeId();
  const pollMs = readPollMs();

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
