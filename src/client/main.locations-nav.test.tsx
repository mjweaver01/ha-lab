import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { GlobalWindow } from "happy-dom";
import type { ComponentType } from "react";
import { App } from "./main.tsx";
import type { UseEventsPollOptions } from "./hooks/use-events-poll.ts";
import {
  DEFAULT_MEDIA_DETECTION_SETTINGS,
  saveMediaDetectionSettings,
} from "./lib/media-settings.ts";
import { MEDIA_VISION_EVENT_TYPE } from "./lib/media-event-types.ts";

beforeAll(() => {
  const happyWindow = new GlobalWindow({ url: "http://localhost/" });
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
  globalThis.document = happyWindow.document as unknown as Document;
  globalThis.HTMLElement =
    happyWindow.HTMLElement as unknown as typeof globalThis.HTMLElement;
  globalThis.navigator = happyWindow.navigator as unknown as Navigator;
  globalThis.sessionStorage = happyWindow.sessionStorage;
});

beforeEach(() => {
  globalThis.sessionStorage.clear();
  globalThis.window.localStorage.clear();
  globalThis.window.history.replaceState({}, "", "/events");
});

describe("locations navigation", () => {
  test("open location routes to location-scoped events and supports back navigation", async () => {
    const includeArchivedState = { value: false };
    const openCalls: number[] = [];

    const EventsStub: ComponentType<{
      locationId: number | null;
      onOpenMediaSettings: () => void;
    }> = ({ locationId }) => (
      <div>{locationId == null ? "events for all locations" : `events for location: ${locationId}`}</div>
    );

    const LocationsStub: ComponentType<{
      onOpenLocation: (locationId: number) => void;
    }> = ({ onOpenLocation }) => (
      <div>
        <p>locations hub</p>
        <p>include archived: {includeArchivedState.value ? "on" : "off"}</p>
        <button
          type="button"
          onClick={() => {
            includeArchivedState.value = true;
          }}
        >
          include archived on
        </button>
        <button
          type="button"
          onClick={() => {
            openCalls.push(42);
            onOpenLocation(42);
          }}
        >
          Open row 42
        </button>
        <button
          type="button"
          onClick={() => {
            openCalls.push(42);
            onOpenLocation(42);
          }}
        >
          Open action 42
        </button>
      </div>
    );

    const DetailStub: ComponentType<{
      locationId?: number | null;
      onBackToLocations: () => void;
    }> = ({ locationId, onBackToLocations }) => (
      <div>
        <p>location detail id: {locationId ?? "none"}</p>
        <button type="button" onClick={onBackToLocations}>
          Back to locations
        </button>
      </div>
    );

    const view = render(
      <App
        deps={{
          useEventsPollHook: (options?: UseEventsPollOptions) => ({
            events: [],
            error: null,
            loading: false,
            onRefresh: () => {},
            newIds: new Set<number>(),
            locationId: options?.locationId ?? null,
            pollMs: 3000,
          }),
          EventsScreenComponent: EventsStub as never,
          LocationsScreenComponent: LocationsStub as never,
          LocationDetailScreenComponent: DetailStub as never,
          createLocationFn: async () => {
            throw new Error("not used in this navigation test");
          },
          updateLocationFn: async () => {
            throw new Error("not used in this navigation test");
          },
        }}
      />,
    );

    expect(view.getByText("events for all locations")).toBeDefined();

    fireEvent.click(view.getByText("Locations"));
    expect(view.getByText("locations hub")).toBeDefined();
    expect(view.getByText("include archived: off")).toBeDefined();

    fireEvent.click(view.getByText("include archived on"));
    fireEvent.click(view.getByText("Open row 42"));
    expect(view.getByText("events for location: 42")).toBeDefined();
    fireEvent.click(view.getByText("Locations"));
    expect(view.getByText("locations hub")).toBeDefined();
    expect(view.getByText("include archived: on")).toBeDefined();
    expect(openCalls).toEqual([42]);

    view.rerender(
      <App
        deps={{
          useEventsPollHook: (options?: UseEventsPollOptions) => ({
            events: [],
            error: null,
            loading: false,
            onRefresh: () => {},
            newIds: new Set<number>(),
            locationId: options?.locationId ?? null,
            pollMs: 3000,
          }),
          EventsScreenComponent: EventsStub as never,
          LocationsScreenComponent: LocationsStub as never,
          LocationDetailScreenComponent: DetailStub as never,
          createLocationFn: async () => {
            throw new Error("not used in this navigation test");
          },
          updateLocationFn: async () => {
            throw new Error("not used in this navigation test");
          },
        }}
      />,
    );

    fireEvent.click(view.getByText("Open action 42"));
    expect(view.getByText("events for location: 42")).toBeDefined();
    expect(openCalls).toEqual([42, 42]);
  });

  test("shows rule-based notifications away from events page", () => {
    const calls: Array<{ title: string; body: string | undefined; tag: string | undefined }> = [];
    class NotificationMock {
      static permission: NotificationPermission = "granted";
      static requestPermission(): Promise<NotificationPermission> {
        return Promise.resolve("granted");
      }

      constructor(title: string, options?: NotificationOptions) {
        calls.push({ title, body: options?.body, tag: options?.tag });
      }
    }
    (globalThis as typeof globalThis & { Notification: typeof Notification }).Notification =
      NotificationMock as unknown as typeof Notification;

    saveMediaDetectionSettings(
      {
        ...DEFAULT_MEDIA_DETECTION_SETTINGS,
        notifications: { enabled: true },
        detectionRules: [
          {
            id: "rule-person",
            name: "Person alert",
            kind: "action",
            pattern: "person",
            minScore: 0.8,
            cooldownMs: 30_000,
            scope: "global",
            locationId: null,
            notify: true,
            enabled: true,
          },
        ],
      },
      1,
    );

    const EventsStub: ComponentType<{
      locationId: number | null;
      onOpenMediaSettings: () => void;
    }> = ({ locationId }) => (
      <div>{locationId == null ? "events for all locations" : `events for location: ${locationId}`}</div>
    );

    const LocationsStub: ComponentType<{
      onOpenLocation: (locationId: number) => void;
    }> = () => <div>locations hub</div>;

    const DetailStub: ComponentType<{
      locationId?: number | null;
      onBackToLocations: () => void;
    }> = ({ locationId, onBackToLocations }) => (
      <div>
        <p>location detail id: {locationId ?? "none"}</p>
        <button type="button" onClick={onBackToLocations}>
          Back to locations
        </button>
      </div>
    );

    const view = render(
      <App
        deps={{
          useEventsPollHook: (options?: UseEventsPollOptions) => ({
            events:
              options?.includeAllLocations === true
                ? [
                    {
                      id: 8,
                      location_id: 42,
                      event_type: MEDIA_VISION_EVENT_TYPE,
                      created_at: "2026-04-16T12:00:00.000Z",
                      body: {
                        source: "video",
                        top_label: "person",
                        top_score: 0.92,
                        candidates: [{ label: "person", score: 0.92 }],
                      },
                    },
                  ]
                : [],
            error: null,
            loading: false,
            onRefresh: () => {},
            newIds: options?.includeAllLocations === true ? new Set<number>([8]) : new Set<number>(),
            locationId: options?.locationId ?? null,
            pollMs: 3000,
          }),
          EventsScreenComponent: EventsStub as never,
          LocationsScreenComponent: LocationsStub as never,
          LocationDetailScreenComponent: DetailStub as never,
          createLocationFn: async () => {
            throw new Error("not used in this notification test");
          },
          updateLocationFn: async () => {
            throw new Error("not used in this notification test");
          },
        }}
      />,
    );

    fireEvent.click(view.getByText("Locations"));
    expect(view.getByText("locations hub")).toBeDefined();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      title: "Action detected",
      body: "Person alert • person (92%) • location 42",
      tag: "ha-rule-1-42-rule-person-8",
    });
  });
});
