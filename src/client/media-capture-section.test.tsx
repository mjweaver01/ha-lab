import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import { GlobalWindow } from "happy-dom";
import { MediaCaptureSection } from "./media-capture-section.tsx";
import { DEFAULT_MEDIA_DETECTION_SETTINGS } from "./lib/media-settings.ts";

const happyWindow = new GlobalWindow({ url: "http://localhost/" });
globalThis.window = happyWindow as unknown as Window & typeof globalThis;
globalThis.document = happyWindow.document;
globalThis.HTMLElement = happyWindow.HTMLElement;

beforeAll(() => {
  class MockAnalyser {
    fftSize = 2048;
    smoothingTimeConstant = 0.8;
    getFloatTimeDomainData(arr: Float32Array) {
      for (let i = 0; i < arr.length; i++) arr[i] = 0.05;
    }
  }
  class MockAudioContext {
    state: AudioContextState = "running";
    createMediaStreamSource = () =>
      ({
        connect: (n: AudioNode) => n,
      }) as unknown as MediaStreamAudioSourceNode;
    createAnalyser = () => new MockAnalyser() as unknown as AnalyserNode;
    close = async () => {
      this.state = "closed";
    };
  }
  globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    happyWindow.setTimeout(() => {
      cb(performance.now());
    }, 0) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number) => {
    happyWindow.clearTimeout(id);
  };
});

function makeTrack(kind: "audio" | "video"): MediaStreamTrack {
  return {
    kind,
    stop: mock(() => {}),
    onended: null,
  } as unknown as MediaStreamTrack;
}

function makeStream(tracks: MediaStreamTrack[]): MediaStream {
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === "audio"),
    getVideoTracks: () => tracks.filter((t) => t.kind === "video"),
  } as MediaStream;
}

afterEach(() => {
  mock.restore();
});

describe("MediaCaptureSection", () => {
  test("renders Start microphone and Media capture", () => {
    const audioTrack = makeTrack("audio");
    const stream = makeStream([audioTrack]);
    const getUserMedia = mock(() => Promise.resolve(stream));
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: { getUserMedia },
      configurable: true,
    });

    const { container } = render(
      <MediaCaptureSection
        settings={{
          audioLevelBoost: DEFAULT_MEDIA_DETECTION_SETTINGS.audioLevelBoost,
          audioActivityThreshold: DEFAULT_MEDIA_DETECTION_SETTINGS.audioThreshold,
          videoActivityThreshold: DEFAULT_MEDIA_DETECTION_SETTINGS.videoThreshold,
          videoSampleCadenceMs: DEFAULT_MEDIA_DETECTION_SETTINGS.videoCadenceMs,
          learningMatchThreshold: DEFAULT_MEDIA_DETECTION_SETTINGS.learningThreshold,
        }}
      />,
    );
    const text = container.textContent ?? "";
    expect(text.includes("Media capture")).toBe(true);
    expect(text.includes("Start microphone")).toBe(true);
  });

  test("shows events-error with role=alert when getUserMedia rejects", async () => {
    const getUserMedia = mock(() =>
      Promise.reject(new DOMException("denied", "NotAllowedError")),
    );
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: { getUserMedia },
      configurable: true,
    });

    const { container } = render(
      <MediaCaptureSection
        settings={{
          audioLevelBoost: DEFAULT_MEDIA_DETECTION_SETTINGS.audioLevelBoost,
          audioActivityThreshold: DEFAULT_MEDIA_DETECTION_SETTINGS.audioThreshold,
          videoActivityThreshold: DEFAULT_MEDIA_DETECTION_SETTINGS.videoThreshold,
          videoSampleCadenceMs: DEFAULT_MEDIA_DETECTION_SETTINGS.videoCadenceMs,
          learningMatchThreshold: DEFAULT_MEDIA_DETECTION_SETTINGS.learningThreshold,
        }}
      />,
    );
    const btn = [...container.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Start microphone"),
    );
    expect(btn).toBeDefined();

    await act(async () => {
      (btn as HTMLButtonElement).click();
    });

    await waitFor(() => {
      expect(container.querySelector(".events-error")).not.toBeNull();
    });
    expect(container.querySelector(".events-error")?.getAttribute("role")).toBe("alert");
  });
});
