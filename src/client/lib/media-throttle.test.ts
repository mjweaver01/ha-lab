import { describe, expect, test } from "bun:test";
import { createMediaThrottleState } from "./media-throttle.ts";

describe("createMediaThrottleState", () => {
  test("audio clock allows first emit, blocks within 3000ms, then allows at 3000ms", () => {
    const throttle = createMediaThrottleState();

    expect(throttle.canEmitAudio(0)).toBe(true);
    throttle.markAudioEmitted(0);

    expect(throttle.canEmitAudio(2999)).toBe(false);
    expect(throttle.canEmitAudio(3000)).toBe(true);
  });

  test("video clock allows first emit, blocks within 4000ms, then allows at 4000ms", () => {
    const throttle = createMediaThrottleState();

    expect(throttle.canEmitVideo(0)).toBe(true);
    throttle.markVideoEmitted(0);

    expect(throttle.canEmitVideo(3999)).toBe(false);
    expect(throttle.canEmitVideo(4000)).toBe(true);
  });

  test("audio and video clocks are independent", () => {
    const throttle = createMediaThrottleState();

    throttle.markAudioEmitted(1000);
    expect(throttle.canEmitAudio(3000)).toBe(false);
    expect(throttle.canEmitVideo(1001)).toBe(true);

    throttle.markVideoEmitted(2000);
    expect(throttle.canEmitVideo(5000)).toBe(false);
    expect(throttle.canEmitAudio(4000)).toBe(true);
  });
});
