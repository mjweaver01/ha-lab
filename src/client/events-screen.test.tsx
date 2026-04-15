import { beforeAll, describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { GlobalWindow } from "happy-dom";
import { EventsScreen } from "./events-screen.tsx";

beforeAll(() => {
  const happyWindow = new GlobalWindow({ url: "http://localhost/" });
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
  globalThis.document = happyWindow.document;
  globalThis.HTMLElement = happyWindow.HTMLElement;
  globalThis.HTMLVideoElement = happyWindow.HTMLVideoElement;
  globalThis.navigator = happyWindow.navigator;
});

describe("EventsScreen media E2E trace", () => {
  test("renders media.audio and media.video rows with normal list behavior", () => {
    const events = [
      {
        id: 102,
        home_id: 1,
        event_type: "media.video",
        created_at: "2026-04-15T20:00:00.000Z",
        body: { source: "video", top_label: "person", top_score: 0.87 },
      },
      {
        id: 101,
        home_id: 1,
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
        homeId={1}
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
    expect(container.querySelectorAll(".events-row").length).toBe(2);
    expect(container.querySelectorAll(".events-row--new").length).toBe(1);
  });
});
