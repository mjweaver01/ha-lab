import { beforeAll, describe, expect, test } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import { GlobalWindow } from "happy-dom";
import { EventsScreen } from "./events-screen.tsx";

beforeAll(() => {
  const happyWindow = new GlobalWindow({ url: "http://localhost/" });
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
  globalThis.document = happyWindow.document as unknown as Document;
  globalThis.HTMLElement =
    happyWindow.HTMLElement as unknown as typeof globalThis.HTMLElement;
  globalThis.HTMLVideoElement =
    happyWindow.HTMLVideoElement as unknown as typeof globalThis.HTMLVideoElement;
  globalThis.navigator = happyWindow.navigator as unknown as Navigator;
});

describe("EventsScreen media E2E trace", () => {
  test("renders media.audio and media.video rows with normal list behavior", () => {
    const events = [
      {
        id: 102,
        location_id: 1,
        event_type: "media.video",
        created_at: "2026-04-15T20:00:00.000Z",
        body: { source: "video", top_label: "person", top_score: 0.87 },
      },
      {
        id: 101,
        location_id: 1,
        event_type: "media.audio",
        created_at: "2026-04-15T19:59:57.000Z",
        body: { source: "audio", top_label: "speech", top_score: 0.81 },
      },
    ];

    const { getByText, container } = render(
      <EventsScreen
        events={events}
        error={null}
        loading={false}
        onRefresh={() => {}}
        newIds={new Set([102])}
        locationId={1}
        pollMs={3000}
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

    expect(getByText("media.audio")).toBeDefined();
    expect(getByText("media.video")).toBeDefined();
    expect(container.querySelectorAll(".ui-list-row").length).toBe(2);
    expect(container.querySelectorAll(".ui-list-row--new").length).toBe(1);
  });

  test("toggles friendly and raw log rendering", () => {
    const events = [
      {
        id: 201,
        location_id: 1,
        event_type: "media.detected",
        created_at: "2026-04-16T12:00:00.000Z",
        body: {
          rule_name: "Person alert",
          confidence: 0.92,
          match_score: 0.92,
          candidates: [
            { label: "person", score: 0.92 },
            { label: "motion", score: 0.7 },
          ],
        },
      },
    ];

    const { container, getByText, queryByText } = render(
      <EventsScreen
        events={events}
        error={null}
        loading={false}
        onRefresh={() => {}}
        newIds={new Set()}
        locationId={1}
        pollMs={3000}
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

    expect(within(container).getByText("rule name")).toBeDefined();
    expect(within(container).getByText("Person alert")).toBeDefined();
    expect(within(container).getByText("confidence")).toBeDefined();
    expect(within(container).getByText("person (92%), motion (70%)")).toBeDefined();
    fireEvent.click(within(container).getByText("Nice"));
    expect(within(container).getByText(/"rule_name": "Person alert"/)).toBeDefined();
    expect(queryByText("rule name")).toBeNull();
  });

  test("toggles live tail button label on click", () => {
    const { container, getByText, queryByText } = render(
      <EventsScreen
        events={[]}
        error={null}
        loading={false}
        onRefresh={() => {}}
        newIds={new Set()}
        locationId={null}
        pollMs={3000}
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

    expect(queryByText("Refresh events")).toBeNull();
    const offButton = within(container).getByRole("button", { name: "Live tail" });
    fireEvent.click(offButton);
    expect(within(container).getByRole("button", { name: "Timeframe" })).toBeDefined();
    expect(getByText("Refresh events")).toBeDefined();
  });

  test("custom timeframe controls update without runtime errors", () => {
    const { container, getByText, getByDisplayValue } = render(
      <EventsScreen
        events={[]}
        error={null}
        loading={false}
        onRefresh={() => {}}
        newIds={new Set()}
        locationId={null}
        pollMs={3000}
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

    fireEvent.click(within(container).getByRole("button", { name: "Live tail" }));
    fireEvent.change(within(container).getByDisplayValue("Last 1h"), {
      target: { value: "custom" },
    });
    const dateInputs = container.querySelectorAll("input[type='date']");
    const timeInputs = container.querySelectorAll("input[type='time']");
    const startDateInput = dateInputs[0] as HTMLInputElement | undefined;
    const endDateInput = dateInputs[1] as HTMLInputElement | undefined;
    const startTimeInput = timeInputs[0] as HTMLInputElement | undefined;
    const endTimeInput = timeInputs[1] as HTMLInputElement | undefined;
    if (
      startDateInput == null ||
      endDateInput == null ||
      startTimeInput == null ||
      endTimeInput == null
    ) {
      throw new Error("expected custom timeframe date/time inputs");
    }
    fireEvent.change(startDateInput, { target: { value: "2026-04-16" } });
    fireEvent.change(startTimeInput, { target: { value: "09:00" } });
    fireEvent.change(endDateInput, { target: { value: "2026-04-16" } });
    fireEvent.change(endTimeInput, { target: { value: "10:00" } });

    expect(getByText("Timeframe: custom start/end.")).toBeDefined();
  });

  test("hides media capture on all-locations view", () => {
    const { container } = render(
      <EventsScreen
        events={[]}
        error={null}
        loading={false}
        onRefresh={() => {}}
        newIds={new Set()}
        locationId={null}
        pollMs={3000}
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

    expect(within(container).queryByText("Media capture")).toBeNull();
  });
});
