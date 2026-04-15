import type { EventListItem } from "./api/events-client.ts";

export type EventsScreenProps = {
  events: EventListItem[];
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  newIds: ReadonlySet<number>;
  homeId: number;
  pollMs: number;
};

export function EventsScreen({
  events,
  error,
  loading,
  onRefresh,
  newIds,
  homeId,
  pollMs,
}: EventsScreenProps) {
  return (
    <div className="events-page">
      <h1 className="events-page__title">Events</h1>
      <p className="events-page__meta">
        Home ID: {homeId} · Poll every {Math.round(pollMs / 1000)}s
      </p>

      <div className="events-toolbar">
        <button type="button" className="events-btn" onClick={onRefresh}>
          Refresh events
        </button>
      </div>

      {error != null && error !== "" ? (
        <div className="events-error" role="alert">
          Could not load events. Check the API URL and that the server is running.
        </div>
      ) : null}

      {loading && events.length === 0 && error == null ? (
        <p className="events-loading" aria-busy="true">
          Loading…
        </p>
      ) : null}

      {!loading && error == null && events.length === 0 ? (
        <div className="events-panel">
          <div className="events-empty">
            <h2 className="events-empty__title">No events yet</h2>
            <p className="events-empty__body">
              Start the orchestrator and simulator, or trigger an event — activity will show here.
            </p>
          </div>
        </div>
      ) : null}

      {events.length > 0 ? (
        <div className="events-panel">
          <ul className="events-list">
            {events.map((ev) => (
              <li
                key={ev.id}
                className={
                  newIds.has(ev.id) ? "events-row events-row--new" : "events-row"
                }
              >
                <div className="events-row__type">{ev.event_type}</div>
                <div className="events-row__time">{ev.created_at}</div>
                <pre className="events-row__body">
                  {ev.body == null
                    ? "—"
                    : typeof ev.body === "string"
                      ? ev.body
                      : JSON.stringify(ev.body, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
