import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Edit3, Eye, EyeOff, Radio, RefreshCw } from "lucide-react";
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
  locationId: number | null;
  pollMs: number;
  captureSettings: UseMediaCaptureOptions;
  onOpenMediaSettings: () => void;
  onEditLocation?: () => void;
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

type FriendlyLogRow = {
  key: string;
  value: string;
};

function formatCandidates(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const rendered = value
    .map((entry) => {
      if (typeof entry !== "object" || entry == null) {
        return null;
      }
      const candidate = entry as Record<string, unknown>;
      const label =
        typeof candidate.label === "string" && candidate.label.trim() !== ""
          ? candidate.label.trim()
          : null;
      const score =
        typeof candidate.score === "number" && Number.isFinite(candidate.score)
          ? `${Math.round(candidate.score * 100)}%`
          : null;
      if (label == null && score == null) {
        return null;
      }
      if (label != null && score != null) {
        return `${label} (${score})`;
      }
      return label ?? score ?? null;
    })
    .filter((entry): entry is string => entry != null);
  if (rendered.length === 0) {
    return null;
  }
  return rendered.join(", ");
}

function toFriendlyValue(value: unknown): string {
  if (value == null) {
    return "none";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  return "object";
}

function formatFriendlyKey(key: string): string {
  return key.replace(/_/g, " ");
}

function formatFriendlyBody(body: unknown): FriendlyLogRow[] {
  if (body == null) {
    return [{ key: "payload", value: "No payload" }];
  }
  if (typeof body === "string") {
    return [{ key: "payload", value: body }];
  }
  if (Array.isArray(body)) {
    return [{ key: "payload", value: `${body.length} item${body.length === 1 ? "" : "s"}` }];
  }
  if (typeof body !== "object") {
    return [{ key: "payload", value: String(body) }];
  }

  const entries = Object.entries(body as Record<string, unknown>);
  if (entries.length === 0) {
    return [{ key: "payload", value: "No payload fields" }];
  }
  return entries
    .slice(0, 6)
    .map(([key, value]) => {
      if (key === "top_score" && typeof value === "number" && Number.isFinite(value)) {
        return {
          key: formatFriendlyKey(key),
          value: `${Math.round(value * 100)}%`,
        };
      }
      if (key === "candidates") {
        const renderedCandidates = formatCandidates(value);
        return {
          key: formatFriendlyKey(key),
          value: renderedCandidates ?? "none",
        };
      }
      return {
        key: formatFriendlyKey(key),
        value: toFriendlyValue(value),
      };
    })
    .filter((row) => row.key.trim() !== "");
}

function splitLocalDateTime(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return {
    date,
    time: time.slice(0, 5),
  };
}

function mergeLocalDateTime(date: string, time: string): string {
  if (!date) {
    return "";
  }
  return `${date}T${time || "00:00"}`;
}

export function EventsScreen({
  events,
  error,
  loading,
  onRefresh,
  newIds,
  locationId,
  pollMs,
  captureSettings,
  onOpenMediaSettings,
  onEditLocation,
}: EventsScreenProps) {
  const [filter, setFilter] = useState<EventsFilterState>(DEFAULT_FILTER);
  const [friendlyLogs, setFriendlyLogs] = useState(true);
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
  const customStartParts = splitLocalDateTime(filter.customStart);
  const customEndParts = splitLocalDateTime(filter.customEnd);

  return (
    <div className="ui-page">
      <div className="ui-page-header">
        <div>
          <h1 className="ui-page-title">Events</h1>
          <p className="ui-page-meta">
            {locationId == null ? "All accessible locations" : `Location ID: ${locationId}`} · Poll every{" "}
            {Math.round(pollMs / 1000)}s
          </p>
        </div>
        <div className="ui-page-actions">
          {locationId != null && onEditLocation != null ? (
            <button type="button" className="ui-btn ui-btn--with-icon" onClick={onEditLocation}>
              <span className="ui-btn__icon" aria-hidden>
                <Edit3 size={16} />
              </span>
              Edit location
            </button>
          ) : null}
        </div>
      </div>

      <MediaCaptureSection settings={captureSettings} />

      <div className="ui-panel ui-filter">
        <div className="ui-filter-row">
          <label className="ui-field">
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
          <label className="ui-field">
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
          <button
            type="button"
            className="ui-btn ui-btn--with-icon ui-filter-refresh"
            aria-pressed={filter.mode === "tail"}
            onClick={() => {
              setFilter((prev) => ({
                ...prev,
                mode: prev.mode === "tail" ? "timeframe" : "tail",
              }));
            }}
          >
            <span className="ui-btn__icon" aria-hidden>
              <Radio size={16} />
            </span>
            {filter.mode === "tail" ? "Turn live tail off" : "Turn live tail on"}
          </button>
          {filter.mode !== "tail" ? (
            <button type="button" className="ui-btn ui-btn--with-icon" onClick={onRefresh}>
              <span className="ui-btn__icon" aria-hidden>
                <RefreshCw size={16} />
              </span>
              Refresh events
            </button>
          ) : null}
          <button
            type="button"
            className="ui-btn ui-btn--with-icon"
            aria-pressed={friendlyLogs}
            onClick={() => {
              setFriendlyLogs((prev) => !prev);
            }}
          >
            <span className="ui-btn__icon" aria-hidden>
              {friendlyLogs ? <Eye size={16} /> : <EyeOff size={16} />}
            </span>
            {friendlyLogs ? "Friendly logs" : "Raw JSON"}
          </button>
          {filter.mode === "timeframe" ? (
            <label className="ui-field">
              <span>Preset</span>
              <select
                value={filter.preset}
                onChange={(event) => {
                  const nextPreset = event.currentTarget.value as TimeRangePreset;
                  setFilter((prev) => ({
                    ...prev,
                    preset: nextPreset,
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
          <div className="ui-filter-row">
            <label className="ui-field">
              <span>Start date</span>
              <input
                type="date"
                value={customStartParts.date}
                onChange={(event) => {
                  const nextDate = event.currentTarget.value;
                  setFilter((prev) => ({
                    ...prev,
                    customStart: mergeLocalDateTime(nextDate, splitLocalDateTime(prev.customStart).time),
                  }));
                }}
              />
            </label>
            <label className="ui-field">
              <span>Start time</span>
              <input
                type="time"
                value={customStartParts.time}
                onChange={(event) => {
                  const nextTime = event.currentTarget.value;
                  setFilter((prev) => ({
                    ...prev,
                    customStart: mergeLocalDateTime(splitLocalDateTime(prev.customStart).date, nextTime),
                  }));
                }}
              />
            </label>
            <label className="ui-field">
              <span>End date</span>
              <input
                type="date"
                value={customEndParts.date}
                onChange={(event) => {
                  const nextDate = event.currentTarget.value;
                  setFilter((prev) => ({
                    ...prev,
                    customEnd: mergeLocalDateTime(nextDate, splitLocalDateTime(prev.customEnd).time),
                  }));
                }}
              />
            </label>
            <label className="ui-field">
              <span>End time</span>
              <input
                type="time"
                value={customEndParts.time}
                onChange={(event) => {
                  const nextTime = event.currentTarget.value;
                  setFilter((prev) => ({
                    ...prev,
                    customEnd: mergeLocalDateTime(splitLocalDateTime(prev.customEnd).date, nextTime),
                  }));
                }}
              />
            </label>
          </div>
        ) : null}

        <p className="ui-filter-summary">
          {timeframeSummary}
        </p>
      </div>

      {error != null && error !== "" ? (
        <div className="ui-alert ui-alert--error" role="alert">
          Could not load events. Check the API URL and that the server is running.
        </div>
      ) : null}

      {loading && events.length === 0 && error == null ? (
        <p className="ui-loading" aria-busy="true">
          Loading…
        </p>
      ) : null}

      {!loading && error == null && filteredEvents.length === 0 ? (
        <div className="ui-panel">
          <div className="ui-empty">
            <h2 className="ui-empty__title">
              {events.length === 0 ? "No events yet" : "No events in selected timeframe"}
            </h2>
            <p className="ui-empty__body">
              {events.length === 0
                ? "Start the orchestrator and simulator, or trigger an event — activity will show here."
                : "Adjust the timeframe filters or switch to live tail."}
            </p>
          </div>
        </div>
      ) : null}

      {filteredEvents.length > 0 ? (
        <div className="ui-panel">
          <p className="ui-filter-summary ui-filter-summary__events">
            Showing {filteredEvents.length} matched event
            {filteredEvents.length === 1 ? "" : "s"}.
          </p>

          <div
            ref={listViewportRef}
            className="ui-list-viewport"
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
            <ul className="ui-list">
              {topSpacerHeight > 0 ? (
                <li style={{ height: `${topSpacerHeight}px` }} aria-hidden />
              ) : null}
              {visibleRows.map((ev) => (
                <li
                  key={ev.id}
                  className={newIds.has(ev.id) ? "ui-list-row ui-list-row--new" : "ui-list-row"}
                >
                  <div className="ui-list-row__type">{ev.event_type}</div>
                  <div className="ui-list-row__time">{ev.created_at}</div>
                  {friendlyLogs ? (
                    <table className="ui-list-row__body ui-list-row__body--friendly ui-log-table">
                      <tbody>
                        {formatFriendlyBody(ev.body).map((row) => (
                          <tr key={`${ev.id}-${row.key}`}>
                            <th scope="row">{row.key}</th>
                            <td>{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <pre className="ui-list-row__body">
                      {ev.body == null
                        ? "—"
                        : typeof ev.body === "string"
                          ? ev.body
                          : JSON.stringify(ev.body, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
              {bottomSpacerHeight > 0 ? (
                <li style={{ height: `${bottomSpacerHeight}px` }} aria-hidden />
              ) : null}
            </ul>
          </div>

          <div className="ui-pagination">
            <button
              type="button"
              className="ui-btn ui-btn--with-icon"
              onClick={() => {
                setPage((current) => Math.max(1, current - 1));
              }}
              disabled={safePage <= 1}
            >
              <span className="ui-btn__icon" aria-hidden>
                <ChevronLeft size={16} />
              </span>
              Previous
            </button>
            <span>
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className="ui-btn ui-btn--with-icon"
              onClick={() => {
                setPage((current) => Math.min(totalPages, current + 1));
              }}
              disabled={safePage >= totalPages}
            >
              Next
              <span className="ui-btn__icon" aria-hidden>
                <ChevronRight size={16} />
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
