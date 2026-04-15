import { describe, expect, test } from "bun:test";
import { createMediaSignalPipeline } from "./media-signals.ts";

describe("createMediaSignalPipeline video", () => {
  test("accepted video classification emits media.video and respects 4s throttle", async () => {
    let now = 250;
    const emitted: unknown[] = [];
    const pipeline = createMediaSignalPipeline({
      homeId: 11,
      nowMs: () => now,
      videoThreshold: 0.6,
      emit: (event) => {
        emitted.push(event);
      },
    });

    await pipeline.handleVideoClassification({
      candidates: [{ label: "person", score: 0.8 }],
    });
    await pipeline.handleVideoClassification({
      candidates: [{ label: "person", score: 0.9 }],
    });

    now = 4250;
    await pipeline.handleVideoClassification({
      candidates: [{ label: "person", score: 0.92 }],
    });

    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toMatchObject({
      event_type: "media.video",
      body: {
        source: "video",
        top_label: "person",
      },
    });
    expect(() => JSON.stringify(emitted[0])).not.toThrow();
  });

  test("empty or below-threshold video results emit nothing and do not move throttle", async () => {
    let now = 0;
    const emitted: unknown[] = [];
    const pipeline = createMediaSignalPipeline({
      homeId: 2,
      nowMs: () => now,
      videoThreshold: 0.8,
      emit: (event) => {
        emitted.push(event);
      },
    });

    // emit nothing for empty candidates
    await pipeline.handleVideoClassification({ candidates: [] });

    // emit nothing below-threshold, throttle remains open for next accepted result
    await pipeline.handleVideoClassification({
      candidates: [{ label: "cat", score: 0.2 }],
    });

    now = 10;
    await pipeline.handleVideoClassification({
      candidates: [{ label: "person", score: 0.91 }],
    });

    expect(emitted).toHaveLength(1);
  });
});
