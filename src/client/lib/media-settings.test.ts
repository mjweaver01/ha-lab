import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { GlobalWindow } from "happy-dom";
import {
  DEFAULT_MEDIA_DETECTION_SETTINGS,
  loadMediaDetectionSettings,
  saveMediaDetectionSettings,
} from "./media-settings.ts";

let happyWindow: GlobalWindow;

beforeAll(() => {
  happyWindow = new GlobalWindow({ url: "http://localhost/" });
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
  globalThis.document = happyWindow.document as unknown as Document;
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("media settings persistence", () => {
  test("loads defaults when no settings exist", () => {
    const loaded = loadMediaDetectionSettings(11);
    expect(loaded).toEqual(DEFAULT_MEDIA_DETECTION_SETTINGS);
  });

  test("persists settings under per-user key", () => {
    const next = {
      ...DEFAULT_MEDIA_DETECTION_SETTINGS,
      notifications: { enabled: true },
      detectionRules: [
        {
          id: "rule-1",
          name: "person rule",
          kind: "action" as const,
          pattern: "person",
          minScore: 0.7,
          cooldownMs: 10_000,
          scope: "location" as const,
          locationId: 2,
          notify: true,
          enabled: true,
        },
      ],
    };
    saveMediaDetectionSettings(next, 42);

    expect(loadMediaDetectionSettings(1)).toEqual(DEFAULT_MEDIA_DETECTION_SETTINGS);
    const loaded = loadMediaDetectionSettings(42);
    expect(loaded.notifications.enabled).toBe(true);
    expect(loaded.detectionRules).toHaveLength(1);
    expect(loaded.detectionRules[0]?.locationId).toBe(2);
  });
});
