import { describe, expect, test } from "bun:test";
import { createMediaSignalPipeline } from "./media-signals.ts";

describe("createMediaSignalPipeline audio", () => {
  test("accepted audio classification emits media.audio and respects 3s throttle", async () => {
    let now = 1000;
    const emitted: unknown[] = [];
    const pipeline = createMediaSignalPipeline({
      homeId: 9,
      nowMs: () => now,
      audioThreshold: 0.7,
      emit: async (event) => {
        emitted.push(event);
      },
    });

    await pipeline.handleAudioClassification({
      candidates: [{ label: "speech", score: 0.91 }],
    });
    await pipeline.handleAudioClassification({
      candidates: [{ label: "speech", score: 0.95 }],
    });
    now = 4000;
    await pipeline.handleAudioClassification({
      candidates: [{ label: "speech", score: 0.96 }],
    });

    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toMatchObject({
      event_type: "media.audio",
      body: {
        source: "audio",
        top_label: "speech",
      },
    });

    expect(() => JSON.stringify(emitted[0])).not.toThrow();
  });

  test("below-threshold input emits nothing and does not advance throttle clock", async () => {
    let now = 0;
    const emitted: unknown[] = [];
    const pipeline = createMediaSignalPipeline({
      homeId: 1,
      nowMs: () => now,
      audioThreshold: 0.75,
      emit: (event) => {
        emitted.push(event);
      },
    });

    // below-threshold: emit nothing, throttle clock unchanged
    await pipeline.handleAudioClassification({
      candidates: [{ label: "noise", score: 0.2 }],
    });

    now = 500;
    await pipeline.handleAudioClassification({
      candidates: [{ label: "speech", score: 0.9 }],
    });

    expect(emitted).toHaveLength(1);
  });
});
