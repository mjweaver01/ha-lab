import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Code2, Edit3, Eye, Radio, RefreshCw } from "lucide-react";
import type { EventListItem, FetchLike } from "./api/events-client.ts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MediaCaptureSection } from "./media-capture-section.tsx";
import { fetchEventsAnalytics } from "./api/events-analytics-client.ts";
import type { UseMediaCaptureOptions } from "./hooks/use-media-capture.ts";
import {
  computeVirtualWindow,
  computeTimeframe,
  filterEventsByTimeframe,
  paginateEvents,
  type EventsFilterState,
  type TimeRangePreset,
} from "./lib/events-view.ts";
import {
  toConfidenceSeries,
  toDistributionSeries,
  toVolumeSeries,
} from "./lib/events-analytics-view.ts";
import type {
  EventsAnalyticsBucket,
  EventsAnalyticsRange,
  EventsAnalyticsResponse,
} from "../types/events-analytics-api.ts";

export type EventsScreenProps = {
  events: EventListItem[];
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  newIds: ReadonlySet<number>;
  locationId: number | null;
  locationName?: string | null;
  pollMs: number;
  captureSettings: UseMediaCaptureOptions;
  onOpenMediaSettings: () => void;
  onEditLocation?: () => void;
  baseUrl?: string;
  userId?: number;
  fetchAnalyticsImpl?: FetchLike;
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

  const payload = body as Record<string, unknown>;
  const entries = Object.entries(payload);
  const preferredOrder = [
    "source",
    "rule_id",
    "rule_name",
    "rule_kind",
    "rule_scope",
    "rule_location_id",
    "match_value",
    "confidence",
    "match_score",
    "recognition_language",
    "transcript",
    "notify",
    "candidates",
  ];
  const sortedEntries = [...entries].sort((a, b) => {
    const ia = preferredOrder.indexOf(a[0]);
    const ib = preferredOrder.indexOf(b[0]);
    if (ia === -1 && ib === -1) return a[0].localeCompare(b[0]);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const hasExplicitConfidence =
    typeof payload.confidence === "number" && Number.isFinite(payload.confidence);
  if (sortedEntries.length === 0) {
    return [{ key: "payload", value: "No payload fields" }];
  }
  return sortedEntries
    .slice(0, 6)
    .map(([key, value]) => {
      if (key === "top_score" && typeof value === "number" && Number.isFinite(value)) {
        return {
          key: formatFriendlyKey(key),
          value: `${Math.round(value * 100)}%`,
        };
      }
      if (key === "match_score" && hasExplicitConfidence) {
        return null;
      }
      if ((key === "confidence" || key === "match_score") && typeof value === "number") {
        return {
          key: "confidence",
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
    .filter((row): row is FriendlyLogRow => row != null && row.key.trim() !== "");
}

function toIsoOrNull(ms: number | null): string | null {
  if (ms == null) return null;
  return new Date(ms).toISOString();
}

function analyticsBucketFor(filter: EventsFilterState): EventsAnalyticsBucket {
  if (filter.mode !== "timeframe") {
    return "15m";
  }
  switch (filter.preset) {
    case "15m":
      return "5m";
    case "1h":
      return "15m";
    case "3h":
      return "15m";
    case "6h":
      return "1h";
    case "12h":
      return "1h";
    case "24h":
      return "1h";
    case "3d":
      return "6h";
    case "7d":
      return "1d";
    case "30d":
      return "1d";
    case "custom":
      return "15m";
    default:
      return "15m";
  }
}

function analyticsRangeFor(filter: EventsFilterState): EventsAnalyticsRange | undefined {
  if (filter.mode !== "timeframe") return undefined;
  switch (filter.preset) {
    case "15m":
    case "1h":
    case "6h":
    case "24h":
    case "7d":
      return filter.preset;
    default:
      return undefined;
  }
}

export function EventsScreen({
  events,
  error,
  loading,
  onRefresh,
  newIds,
  locationId,
  locationName,
  pollMs,
  captureSettings,
  onOpenMediaSettings,
  onEditLocation,
  baseUrl,
  userId,
  fetchAnalyticsImpl,
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
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<EventsAnalyticsResponse | null>(null);

  const analyticsEnabled = baseUrl != null && Number.isInteger(userId);
  const analyticsUserId = analyticsEnabled ? (userId as number) : null;
  const analyticsBucket = analyticsBucketFor(filter);
  const analyticsTimeframe = useMemo(() => computeTimeframe(filter, Date.now()), [filter]);

  useEffect(() => {
    if (!analyticsEnabled || analyticsUserId == null || baseUrl == null) {
      setAnalytics(null);
      return;
    }
    let cancelled = false;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    void fetchEventsAnalytics(
      baseUrl,
      {
        userId: analyticsUserId,
        mode: filter.mode,
        locationId,
        bucket: analyticsBucket,
        range: analyticsRangeFor(filter),
        start_at:
          filter.mode === "timeframe" ? (toIsoOrNull(analyticsTimeframe.startMs) ?? undefined) : undefined,
        end_at:
          filter.mode === "timeframe" ? (toIsoOrNull(analyticsTimeframe.endMs) ?? undefined) : undefined,
      },
      fetchAnalyticsImpl,
    )
      .then((next) => {
        if (!cancelled) {
          setAnalytics(next);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setAnalyticsError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    analyticsBucket,
    analyticsEnabled,
    analyticsUserId,
    analyticsTimeframe.endMs,
    analyticsTimeframe.startMs,
    baseUrl,
    fetchAnalyticsImpl,
    filter.mode,
    filter.preset,
    locationId,
  ]);

  const volumeSeries = useMemo(
    () => (analytics == null ? [] : toVolumeSeries(analytics)),
    [analytics],
  );
  const distributionSeries = useMemo(
    () => (analytics == null ? [] : toDistributionSeries(analytics)),
    [analytics],
  );
  const confidenceSeries = useMemo(
    () => (analytics == null ? [] : toConfidenceSeries(analytics)),
    [analytics],
  );
  const resolvedLocationName =
    locationId == null ? null : locationName?.trim() || `Location ${locationId}`;
  const pageTitle = locationId == null ? "All Events" : `${resolvedLocationName} Events`;

  return (
    <div className="ui-page">
      <div className="ui-page-header">
        <div>
          <h1 className="ui-page-title">{pageTitle}</h1>
          <p className="ui-page-meta">
            {locationId == null
              ? "All accessible locations"
              : `ID ${locationId}`}{" "}
              · Poll every {" "}{Math.round(pollMs / 1000)}s
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

      {locationId != null ? <MediaCaptureSection settings={captureSettings} /> : null}

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
            {filter.mode === "tail" ? "Live tail" : "Timeframe"}
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
              {friendlyLogs ? <Eye size={16} /> : <Code2 size={16} />}
            </span>
            {friendlyLogs ? "Nice" : "JSON"}
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
                <option value="3h">Last 3h</option>
                <option value="6h">Last 6h</option>
                <option value="12h">Last 12h</option>
                <option value="24h">Last 24h</option>
                <option value="3d">Last 3d</option>
                <option value="7d">Last 7d</option>
                <option value="30d">Last 30d</option>
                <option value="custom">Custom</option>
              </select>
            </label>
          ) : null}
        </div>

        {filter.mode === "timeframe" && filter.preset === "custom" ? (
          <div className="ui-filter-row">
            <label className="ui-field">
              <span>Start</span>
              <input
                type="datetime-local"
                value={filter.customStart}
                onChange={(event) => {
                  setFilter((prev) => ({
                    ...prev,
                    customStart: event.currentTarget.value,
                  }));
                }}
              />
            </label>
            <label className="ui-field">
              <span>End</span>
              <input
                type="datetime-local"
                value={filter.customEnd}
                onChange={(event) => {
                  setFilter((prev) => ({
                    ...prev,
                    customEnd: event.currentTarget.value,
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

      <div className="ui-panel ui-analytics">
        <div className="ui-analytics__header">
          <h2 className="ui-page-title ui-analytics__title">Analytics</h2>
          <p className="ui-filter-summary">Follows current mode/timeframe settings.</p>
        </div>

        {analytics == null && analyticsLoading ? (
          <p className="ui-filter-summary">Loading analytics...</p>
        ) : null}
        {analyticsError != null ? (
          <p className="ui-alert ui-alert--error">Could not load analytics: {analyticsError}</p>
        ) : null}
        {!analyticsEnabled ? (
          <p className="ui-filter-summary">Analytics unavailable (missing API context).</p>
        ) : null}

        {analytics != null && analyticsError == null ? (
          <>
            <p className="ui-filter-summary ui-analytics__summary">
              {analytics.totals.events} events · {analytics.totals.distinctEventTypes} event types ·{" "}
              {analytics.totals.confidenceSamples} confidence samples
            </p>
            <div className="ui-analytics__grid">
              <div className="ui-analytics__card">
                <h3 className="ui-analytics__card-title">Volume trend</h3>
                {volumeSeries.length === 0 ? (
                  <p className="ui-filter-summary">No event volume data in selected range.</p>
                ) : (
                  <div className="ui-analytics__chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart data={volumeSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="label" stroke="#8b949e" />
                        <YAxis stroke="#8b949e" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="eventCount" name="Events" fill="#3d8bfd" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div className="ui-analytics__card">
                <h3 className="ui-analytics__card-title">Event type distribution</h3>
                {distributionSeries.length === 0 ? (
                  <p className="ui-filter-summary">No event-type distribution data.</p>
                ) : (
                  <div className="ui-analytics__chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={distributionSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="eventType" stroke="#8b949e" />
                        <YAxis stroke="#8b949e" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Count" fill="#4ecdc4" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div className="ui-analytics__card">
                <h3 className="ui-analytics__card-title">Confidence trend</h3>
                {confidenceSeries.length === 0 ? (
                  <p className="ui-filter-summary">No confidence samples in selected range.</p>
                ) : (
                  <div className="ui-analytics__chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart data={confidenceSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                        <XAxis dataKey="label" stroke="#8b949e" />
                        <YAxis stroke="#8b949e" domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="avgConfidence"
                          name="Avg confidence %"
                          stroke="#ffd166"
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
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
