import { beforeAll, describe, expect, test } from "bun:test";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { GlobalWindow } from "happy-dom";
import type { FetchLike } from "./api/events-client.ts";
import { fetchEventsAnalytics } from "./api/events-analytics-client.ts";
import { EventsScreen } from "./events-screen.tsx";

beforeAll(() => {
  const happyWindow = new GlobalWindow({ url: "http://localhost/" });
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
  globalThis.document = happyWindow.document as unknown as Document;
  globalThis.HTMLElement =
    happyWindow.HTMLElement as unknown as typeof globalThis.HTMLElement;
  globalThis.SVGElement =
    happyWindow.SVGElement as unknown as typeof globalThis.SVGElement;
  globalThis.navigator = happyWindow.navigator as unknown as Navigator;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("events analytics panel", () => {
  test("analytics client parses valid payload", async () => {
    const fetchImpl: FetchLike = async () =>
      new Response(
        JSON.stringify({
          scope: {
            mode: "timeframe",
            location_id: 1,
            range: "1h",
            bucket: "15m",
            start_at: "2026-01-01T00:00:00.000Z",
            end_at: "2026-01-01T01:00:00.000Z",
            event_type: null,
          },
          volumeTrend: [{ bucket_start: "2026-01-01T00:00:00.000Z", event_count: 3 }],
          eventTypeDistribution: [{ event_type: "media.transcript", event_count: 3, percent: 100 }],
          confidenceTrend: [
            { bucket_start: "2026-01-01T00:00:00.000Z", average_confidence: 0.83, sample_count: 3 },
          ],
          totals: { events: 3, confidenceSamples: 3, distinctEventTypes: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const parsed = await fetchEventsAnalytics(
      "http://127.0.0.1:3000",
      { userId: 1, locationId: 1, range: "1h", bucket: "15m" },
      fetchImpl,
    );
    expect(parsed.totals.events).toBe(3);
    expect(parsed.scope.location_id).toBe(1);
    expect(parsed.volumeTrend).toHaveLength(1);
  });

  test("analytics client throws on non-2xx", async () => {
    const fetchImpl: FetchLike = async () =>
      new Response(JSON.stringify({ error: "nope" }), { status: 500 });
    await expect(
      fetchEventsAnalytics(
        "http://127.0.0.1:3000",
        { userId: 1, range: "1h", bucket: "15m" },
        fetchImpl,
      ),
    ).rejects.toThrow("Failed to load analytics");
  });

  test("analytics client throws on invalid shape", async () => {
    const fetchImpl: FetchLike = async () =>
      new Response(JSON.stringify({ scope: {} }), { status: 200 });
    await expect(
      fetchEventsAnalytics(
        "http://127.0.0.1:3000",
        { userId: 1, range: "1h", bucket: "15m" },
        fetchImpl,
      ),
    ).rejects.toThrow("invalid analytics payload");
  });

  test("charts render and follow events filter settings", async () => {
    const calls: Array<{
      mode: string;
      range: string;
      bucket: string;
      location: string | null;
      startAt: string | null;
      endAt: string | null;
    }> = [];
    const fetchImpl: FetchLike = async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      calls.push({
        mode: url.searchParams.get("mode") ?? "",
        range: url.searchParams.get("range") ?? "",
        bucket: url.searchParams.get("bucket") ?? "",
        location: url.searchParams.get("location_id"),
        startAt: url.searchParams.get("start_at"),
        endAt: url.searchParams.get("end_at"),
      });
      return new Response(
        JSON.stringify({
          scope: {
            mode: (url.searchParams.get("mode") ?? "timeframe") as "tail" | "timeframe",
            location_id: url.searchParams.get("location_id")
              ? Number(url.searchParams.get("location_id"))
              : null,
            range: url.searchParams.get("range"),
            bucket: url.searchParams.get("bucket") ?? "15m",
            start_at: url.searchParams.get("start_at"),
            end_at: url.searchParams.get("end_at"),
            event_type: null,
          },
          volumeTrend: [{ bucket_start: "2026-01-01T00:00:00.000Z", event_count: 4 }],
          eventTypeDistribution: [
            { event_type: "media.vision", event_count: 3, percent: 75 },
            { event_type: "media.transcript", event_count: 1, percent: 25 },
          ],
          confidenceTrend: [
            { bucket_start: "2026-01-01T00:00:00.000Z", average_confidence: 0.81, sample_count: 2 },
          ],
          totals: { events: 4, confidenceSamples: 2, distinctEventTypes: 2 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const { container } = render(
      <EventsScreen
        events={[]}
        error={null}
        loading={false}
        onRefresh={() => {}}
        newIds={new Set()}
        locationId={7}
        pollMs={3000}
        baseUrl="http://127.0.0.1:3000"
        userId={1}
        fetchAnalyticsImpl={fetchImpl}
        captureSettings={{
          audioLevelBoost: 8,
          audioActivityThreshold: 0.2,
          videoActivityThreshold: 0.25,
          videoSampleCadenceMs: 1000,
          learningMatchThreshold: 0.65,
        }}
        onOpenMediaSettings={() => {}}
      />,
    );

    await waitFor(() => {
      expect(within(container).getByText("4 events · 2 event types · 2 confidence samples")).toBeDefined();
    });
    expect(within(container).getByText("Volume trend")).toBeDefined();
    expect(within(container).getByText("Event type distribution")).toBeDefined();
    expect(within(container).getByText("Confidence trend")).toBeDefined();

    fireEvent.click(within(container).getByRole("button", { name: "Live tail" }));
    fireEvent.change(within(container).getByDisplayValue("Last 1h"), {
      target: { value: "6h" },
    });

    await waitFor(() => {
      const last = calls[calls.length - 1];
      expect(last?.mode).toBe("timeframe");
      expect(last?.range).toBe("6h");
      expect(last?.bucket).toBe("1h");
      expect(last?.location).toBe("7");
    });

    fireEvent.click(within(container).getByRole("button", { name: "Timeframe" }));
    await waitFor(() => {
      const last = calls[calls.length - 1];
      expect(last?.mode).toBe("tail");
      expect(last?.range).toBe("");
      expect(last?.startAt).toBeNull();
      expect(last?.endAt).toBeNull();
    });
  });
});
