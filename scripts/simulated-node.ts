/**
 * Simulated hardware node — POSTs sample events to the Phase 2 orchestrator.
 * Base URL: `process.env.ORCHESTRATOR_URL` or `--url` (see `main()`).
 */

import { parseArgs } from "node:util";

/** Phase 2 contract — field names must match orchestrator `PostEventBody`. */
export interface PostEventBody {
  home_id: number;
  event_type: string;
  body?: unknown;
}

/** Normalize and validate orchestrator base URL (http/https only). */
export function normalizeOrchestratorBaseUrl(base: string): string {
  const t = base.trim();
  if (!t) {
    throw new Error("ORCHESTRATOR_URL or --url is required");
  }
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    throw new Error("Invalid orchestrator URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported URL scheme: ${url.protocol}`);
  }
  return url.href;
}

/** Strip a single trailing `/` if present. */
export function stripTrailingSlashOnce(base: string): string {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

/** Full URL for `POST /events` (no `//` before `events`). */
export function eventsPostUrl(base: string): string {
  return `${stripTrailingSlashOnce(normalizeOrchestratorBaseUrl(base))}/events`;
}

export function sampleMotion(home_id: number): PostEventBody {
  return {
    home_id,
    event_type: "motion",
    body: { zone: "driveway", confidence: 0.92 },
  };
}

export function sampleDoor(home_id: number): PostEventBody {
  return {
    home_id,
    event_type: "door",
    body: { door_id: "front", state: "closed" },
  };
}

export function sampleCameraStub(home_id: number): PostEventBody {
  return {
    home_id,
    event_type: "camera.stub",
    body: { clip_id: "demo-001", reason: "motion" },
  };
}

export function allSampleEvents(home_id: number): PostEventBody[] {
  return [sampleMotion(home_id), sampleDoor(home_id), sampleCameraStub(home_id)];
}

/** POST one event to `{base}/events` using Web fetch. */
export async function postEvent(
  baseUrl: string,
  payload: PostEventBody,
): Promise<Response> {
  return fetch(eventsPostUrl(baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      url: { type: "string" },
      home: { type: "string" },
    },
  });

  const homeStr = values.home ?? "1";
  const home_id = Number(homeStr);
  if (!Number.isInteger(home_id)) {
    console.error("Invalid --home: must be an integer");
    process.exit(1);
  }

  /** Lab base URL: optional `--url` or `ORCHESTRATOR_URL` env. */
  const base = values.url ?? process.env.ORCHESTRATOR_URL ?? "";
  void normalizeOrchestratorBaseUrl(base);

  for (const payload of allSampleEvents(home_id)) {
    const response = await postEvent(base, payload);
    if (!response.ok) {
      let snippet = "";
      try {
        const text = await response.text();
        snippet = text.slice(0, 200);
      } catch {
        /* ignore body read errors */
      }
      console.error(
        `POST failed: HTTP ${response.status}${snippet ? ` ${snippet}` : ""}`,
      );
      process.exit(1);
    }
  }
}

if (import.meta.main) {
  void main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
