import { beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { GlobalWindow } from "happy-dom";
import { useMediaCapture } from "./use-media-capture.ts";

let happyWindow: GlobalWindow;

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

beforeEach(() => {
  globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  let rafId = 0;
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafId += 1;
    return happyWindow.setTimeout(() => {
      cb(performance.now());
    }, 0) as unknown as number;
  };
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

describe("useMediaCapture", () => {
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
