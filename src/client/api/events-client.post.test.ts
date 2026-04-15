import { describe, expect, test } from "bun:test";

import type { PostEventBody } from "../../types/events-api.ts";
import * as eventsClient from "./events-client.ts";

const postEvent = (eventsClient as { postEvent?: typeof fetch }).postEvent as (
  baseUrl: string,
  payload: PostEventBody,
  fetchImpl?: typeof fetch,
) => Promise<void>;

describe("postEvent", () => {
  test("POST /events with JSON body", async () => {
    const payload: PostEventBody = {
      home_id: 42,
      event_type: "media.audio",
      body: { top_label: "Speech", top_score: 0.91 },
    };
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(null, { status: 202 });
    };

    await postEvent("http://127.0.0.1:3000", payload, fetchImpl);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://127.0.0.1:3000/events");
    expect(calls[0]?.init?.method).toBe("POST");
    expect((calls[0]?.init?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(calls[0]?.init?.body).toBe(JSON.stringify(payload));
  });

  test("surfaces non-2xx response details", async () => {
    const payload: PostEventBody = {
      home_id: 7,
      event_type: "media.video",
      body: { top_label: "Person", top_score: 0.8 },
    };
    const fetchImpl: typeof fetch = async () =>
      new Response("bad event", { status: 400 });

    await expect(postEvent("http://127.0.0.1:3000", payload, fetchImpl)).rejects.toThrow(
      "Failed to post event (400): bad event",
    );
  });

  test("wraps network failures", async () => {
    const payload: PostEventBody = {
      home_id: 7,
      event_type: "media.audio",
    };
    const fetchImpl: typeof fetch = async () => {
      throw new Error("socket hang up");
    };

    await expect(postEvent("http://127.0.0.1:3000", payload, fetchImpl)).rejects.toThrow(
      "Could not reach orchestrator: socket hang up",
    );
  });
});
