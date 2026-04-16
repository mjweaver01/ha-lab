import { afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { GlobalWindow } from "happy-dom";
import { useMediaCapture } from "./use-media-capture.ts";

let happyWindow: GlobalWindow;
let nowMs = 0;
let originalDateNow = Date.now;

beforeAll(() => {
  happyWindow = new GlobalWindow({ url: "http://localhost/" });
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
  globalThis.document = happyWindow.document;
  globalThis.HTMLElement = happyWindow.HTMLElement;
  globalThis.HTMLVideoElement = happyWindow.HTMLVideoElement;
  globalThis.navigator = happyWindow.navigator;
});

class MockAnalyser {
  fftSize = 2048;
  frequencyBinCount = 1024;
  smoothingTimeConstant = 0.8;
  getFloatTimeDomainData(arr: Float32Array) {
    for (let i = 0; i < arr.length; i++) arr[i] = 0.3;
  }
  getByteFrequencyData(arr: Uint8Array) {
    for (let i = 0; i < arr.length; i++) arr[i] = 160;
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

beforeEach(() => {
  nowMs = 0;
  originalDateNow = Date.now;
  Date.now = () => nowMs;
  globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  let rafId = 0;
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafId += 1;
    return happyWindow.setTimeout(() => {
      nowMs += 1000;
      cb(performance.now());
    }, 0) as unknown as number;
  };
  globalThis.cancelAnimationFrame = (id: number) => {
    happyWindow.clearTimeout(id);
  };
  globalThis.fetch = mock(() =>
    Promise.resolve(new Response(null, { status: 202 })),
  ) as unknown as typeof fetch;
  process.env.PUBLIC_LOCATION_ID = "7";
  process.env.PUBLIC_ORCHESTRATOR_URL = "http://127.0.0.1:3999";
});

afterEach(() => {
  Date.now = originalDateNow;
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

describe("useMediaCapture", () => {
  test("starting mic posts throttled media.audio events", async () => {
    const audioTrack = makeTrack("audio");
    const stream = makeStream([audioTrack]);
    const getUserMedia = mock(() => Promise.resolve(stream));
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: { getUserMedia },
      configurable: true,
    });
    const fetchMock = mock(() =>
      Promise.resolve(new Response(null, { status: 202 })),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useMediaCapture());

    await act(async () => {
      await result.current.startMic();
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const payloads = fetchMock.mock.calls
      .map(([, init]) => init)
      .filter((init): init is RequestInit => Boolean(init && init.method === "POST"))
      .map((init) => JSON.parse(String(init.body)) as { event_type: string });
    expect(payloads.some((payload) => payload.event_type === "media.audio")).toBe(true);
  });

  test("stopping camera halts media.video posts", async () => {
    const videoTrack = makeTrack("video");
    const stream = makeStream([videoTrack]);
    const getUserMedia = mock(() => Promise.resolve(stream));
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: { getUserMedia },
      configurable: true,
    });
    const fetchMock = mock(() =>
      Promise.resolve(new Response(null, { status: 202 })),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useMediaCapture());
    await act(async () => {
      await result.current.startCamera();
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    act(() => {
      result.current.stopCamera();
    });

    expect(result.current.cameraActive).toBe(false);
    expect(videoTrack.stop).toHaveBeenCalled();
  });

  test("pipeline emit failure sets a non-silent mic error", async () => {
    const audioTrack = makeTrack("audio");
    const stream = makeStream([audioTrack]);
    const getUserMedia = mock(() => Promise.resolve(stream));
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: { getUserMedia },
      configurable: true,
    });
    globalThis.fetch = mock(() => Promise.reject(new Error("network down"))) as unknown as typeof fetch;

    const { result } = renderHook(() => useMediaCapture());
    await act(async () => {
      await result.current.startMic();
    });

    await waitFor(() => {
      expect(result.current.micError).not.toBeNull();
    });
  });

  test("startMic / stopMic toggles micActive with mocked getUserMedia", async () => {
    const audioTrack = makeTrack("audio");
    const stream = makeStream([audioTrack]);
    const getUserMedia = mock(() => Promise.resolve(stream));
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: { getUserMedia },
      configurable: true,
    });

    const { result } = renderHook(() => useMediaCapture());

    await act(async () => {
      await result.current.startMic();
    });

    expect(getUserMedia).toHaveBeenCalled();
    expect(result.current.micActive).toBe(true);
    expect(result.current.micError).toBeNull();
    await waitFor(() => {
      expect(result.current.micLevel).toBeGreaterThan(0);
    });

    act(() => {
      result.current.stopMic();
    });

    expect(result.current.micActive).toBe(false);
    expect(audioTrack.stop).toHaveBeenCalled();
  });

  test("NotAllowedError from getUserMedia sets micError", async () => {
    const getUserMedia = mock(() =>
      Promise.reject(new DOMException("denied", "NotAllowedError")),
    );
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      value: { getUserMedia },
      configurable: true,
    });

    const { result } = renderHook(() => useMediaCapture());

    await act(async () => {
      await result.current.startMic();
    });

    await waitFor(() => {
      expect(result.current.micError).not.toBeNull();
    });
    expect(result.current.micError?.startsWith("Microphone access was blocked")).toBe(true);
    expect(result.current.micActive).toBe(false);
  });
});
