import { useEffect, useMemo, useRef, useState } from "react";
import type { EventListItem } from "./api/events-client.ts";
import { MediaCaptureSection } from "./media-capture-section.tsx";
import type { UseMediaCaptureOptions } from "./hooks/use-media-capture.ts";
import {
  computeVirtualWindow,
  filterEventsByTimeframe,
  paginateEvents,
  type EventsFilterState,
  type TimeRangePreset,
} from "./lib/events-view.ts";

export type EventsScreenProps = {
  events: EventListItem[];
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  newIds: ReadonlySet<number>;
  homeId: number;
  pollMs: number;
  captureSettings: UseMediaCaptureOptions;
  onOpenMediaSettings: () => void;
};

const PAGE_SIZES = [25, 50, 100];
const ROW_HEIGHT = 132;
const LIST_VIEWPORT_HEIGHT = 540;
const OVERSCAN_ROWS = 4;

const DEFAULT_FILTER: EventsFilterState = {
  mode: "tail",
  preset: "1h",
  customStart: "",
  customEnd: "",
};

export function EventsScreen({
  events,
  error,
  loading,
  onRefresh,
  newIds,
  homeId,
  pollMs,
  captureSettings,
  onOpenMediaSettings,
}: EventsScreenProps) {
  const [filter, setFilter] = useState<EventsFilterState>(DEFAULT_FILTER);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const listViewportRef = useRef<HTMLDivElement | null>(null);
  const [virtual, setVirtual] = useState({ start: 0, end: 0 });

  const filteredEvents = useMemo(
    () => filterEventsByTimeframe(events, filter),
    [events, filter],
  );
  const pagination = useMemo(
    () => paginateEvents(filteredEvents, page, pageSize),
    [filteredEvents, page, pageSize],
  );
  const pageEvents = pagination.pageEvents;
  const safePage = pagination.page;
  const totalPages = pagination.totalPages;
  const totalRows = pageEvents.length;

  useEffect(() => {
    if (safePage !== page) {
      setPage(safePage);
    }
  }, [safePage, page]);

  useEffect(() => {
    setPage(1);
  }, [filter.mode, filter.preset, filter.customStart, filter.customEnd, pageSize]);

  useEffect(() => {
    const viewport = listViewportRef.current;
    if (viewport != null) {
      viewport.scrollTop = 0;
    }
    setVirtual(
      computeVirtualWindow(totalRows, 0, LIST_VIEWPORT_HEIGHT, ROW_HEIGHT, OVERSCAN_ROWS),
    );
  }, [safePage, totalRows, filter.mode, filter.preset, filter.customStart, filter.customEnd]);

  useEffect(() => {
    if (filter.mode !== "tail" || safePage !== 1) {
      return;
    }
    const viewport = listViewportRef.current;
    if (viewport != null) {
      viewport.scrollTop = 0;
    }
  }, [events, filter.mode, safePage]);

  const visibleWindow = useMemo(
    () =>
      computeVirtualWindow(
        totalRows,
        (listViewportRef.current?.scrollTop ?? 0),
        LIST_VIEWPORT_HEIGHT,
        ROW_HEIGHT,
        OVERSCAN_ROWS,
      ),
    [totalRows],
  );
  const windowStart = Math.min(virtual.start, visibleWindow.start);
  const windowEnd = Math.max(virtual.end, visibleWindow.end);
  const visibleRows = pageEvents.slice(windowStart, windowEnd);
  const topSpacerHeight = windowStart * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalRows - windowEnd) * ROW_HEIGHT);

  const timeframeSummary =
    filter.mode === "tail"
      ? "Live tail: newest events stay on top while polling continues."
      : filter.preset === "custom"
        ? "Timeframe: custom start/end."
        : `Timeframe: last ${filter.preset}.`;

  return (
    <div className="events-page">
      <div className="events-page__header">
        <div>
          <h1 className="events-page__title">Events</h1>
          <p className="events-page__meta">
            Home ID: {homeId} · Poll every {Math.round(pollMs / 1000)}s
          </p>
        </div>
        <div className="events-page__header-actions">
          <button type="button" className="events-btn" onClick={onOpenMediaSettings}>
            Media settings
          </button>
        </div>
      </div>

      <MediaCaptureSection settings={captureSettings} />

      <div className="events-panel events-filter">
        <div className="events-filter__row">
          <label className="events-filter__field">
            <span>Mode</span>
            <select
              value={filter.mode}
              onChange={(event) => {
                const nextMode = event.currentTarget.value as EventsFilterState["mode"];
                setFilter((prev) => ({ ...prev, mode: nextMode }));
              }}
            >
              <option value="tail">Live tail</option>
              <option value="timeframe">Timeframe</option>
            </select>
          </label>
          <label className="events-filter__field">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.currentTarget.value));
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="events-btn events-filter__refresh" onClick={onRefresh}>
            Refresh events
          </button>
          {filter.mode === "timeframe" ? (
            <label className="events-filter__field">
              <span>Preset</span>
              <select
                value={filter.preset}
                onChange={(event) => {
                  setFilter((prev) => ({
                    ...prev,
                    preset: event.currentTarget.value as TimeRangePreset,
                  }));
                }}
              >
                <option value="15m">Last 15m</option>
                <option value="1h">Last 1h</option>
                <option value="6h">Last 6h</option>
                <option value="24h">Last 24h</option>
                <option value="custom">Custom</option>
              </select>
            </label>
          ) : null}
        </div>

        {filter.mode === "timeframe" && filter.preset === "custom" ? (
          <div className="events-filter__row">
            <label className="events-filter__field">
              <span>Start</span>
              <input
                type="datetime-local"
                value={filter.customStart}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFilter((prev) => ({ ...prev, customStart: value }));
                }}
              />
            </label>
            <label className="events-filter__field">
              <span>End</span>
              <input
                type="datetime-local"
                value={filter.customEnd}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFilter((prev) => ({ ...prev, customEnd: value }));
                }}
              />
            </label>
          </div>
        ) : null}

        <p className="events-filter__summary">
          {timeframeSummary} Showing {filteredEvents.length} matched event
          {filteredEvents.length === 1 ? "" : "s"}.
        </p>
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

      {!loading && error == null && filteredEvents.length === 0 ? (
        <div className="events-panel">
          <div className="events-empty">
            <h2 className="events-empty__title">
              {events.length === 0 ? "No events yet" : "No events in selected timeframe"}
            </h2>
            <p className="events-empty__body">
              {events.length === 0
                ? "Start the orchestrator and simulator, or trigger an event — activity will show here."
                : "Adjust the timeframe filters or switch to live tail."}
            </p>
          </div>
        </div>
      ) : null}

      {filteredEvents.length > 0 ? (
        <div className="events-panel">
          <div
            ref={listViewportRef}
            className="events-list-viewport"
            onScroll={(event) => {
              const target = event.currentTarget;
              setVirtual(
                computeVirtualWindow(
                  totalRows,
                  target.scrollTop,
                  target.clientHeight,
                  ROW_HEIGHT,
                  OVERSCAN_ROWS,
                ),
              );
            }}
          >
            <ul className="events-list">
              {topSpacerHeight > 0 ? (
                <li style={{ height: `${topSpacerHeight}px` }} aria-hidden />
              ) : null}
              {visibleRows.map((ev) => (
                <li
                  key={ev.id}
                  className={newIds.has(ev.id) ? "events-row events-row--new" : "events-row"}
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
              {bottomSpacerHeight > 0 ? (
                <li style={{ height: `${bottomSpacerHeight}px` }} aria-hidden />
              ) : null}
            </ul>
          </div>

          <div className="events-pagination">
            <button
              type="button"
              className="events-btn"
              onClick={() => {
                setPage((current) => Math.max(1, current - 1));
              }}
              disabled={safePage <= 1}
            >
              Previous
            </button>
            <span>
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="events-btn"
              onClick={() => {
                setPage((current) => Math.min(totalPages, current + 1));
              }}
              disabled={safePage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
