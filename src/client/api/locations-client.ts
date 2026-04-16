import type {
  CreateLocationBody,
  LocationListItem,
  UpdateLocationBody,
} from "../../types/locations-api.ts";

export type { LocationListItem } from "../../types/locations-api.ts";
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type ClientContext = {
  baseUrl: string;
  userId: number;
};

export type FetchLocationsArgs = ClientContext & {
  includeArchived?: boolean;
};

export type CreateLocationArgs = ClientContext & {
  body: CreateLocationBody;
};

export type UpdateLocationArgs = ClientContext & {
  locationId: number;
  body: UpdateLocationBody;
};

export type ArchiveLocationArgs = ClientContext & {
  locationId: number;
  archiveReason?: string;
};

export type RestoreLocationArgs = ClientContext & {
  locationId: number;
};

function normalizeBaseUrl(baseUrl: string): string {
  const t = baseUrl.trim();
  return t.endsWith("/") ? t : `${t}/`;
}

function assertValidUserId(userId: number): void {
  if (!Number.isFinite(userId) || !Number.isInteger(userId)) {
    throw new Error("userId must be a finite integer");
  }
}

function assertValidLocationId(locationId: number): void {
  if (!Number.isFinite(locationId) || !Number.isInteger(locationId)) {
    throw new Error("locationId must be a finite integer");
  }
}

function locationsUrl(baseUrl: string): URL {
  return new URL("/locations", normalizeBaseUrl(baseUrl));
}

function locationActionUrl(baseUrl: string, locationId: number, action?: "archive" | "restore"): URL {
  const base = normalizeBaseUrl(baseUrl);
  const path = action ? `/locations/${locationId}/${action}` : `/locations/${locationId}`;
  return new URL(path, base);
}

function toWritePayload(body: CreateLocationBody | UpdateLocationBody): UpdateLocationBody {
  const payload: UpdateLocationBody = { name: body.name };

  if (typeof body.code === "string") {
    payload.code = body.code;
  }

  if (typeof body.notes === "string") {
    payload.notes = body.notes;
  }

  return payload;
}

function parseLocationRow(data: unknown): LocationListItem {
  if (typeof data !== "object" || data === null) {
    throw new Error("invalid location row: expected object");
  }
  const o = data as Record<string, unknown>;
  if (typeof o.id !== "number" || !Number.isInteger(o.id)) {
    throw new Error("invalid location row: id");
  }
  if (typeof o.name !== "string") {
    throw new Error("invalid location row: name");
  }
  if (o.code !== null && typeof o.code !== "string") {
    throw new Error("invalid location row: code");
  }
  if (o.notes !== null && typeof o.notes !== "string") {
    throw new Error("invalid location row: notes");
  }
  if (o.archived_at !== null && typeof o.archived_at !== "string") {
    throw new Error("invalid location row: archived_at");
  }
  if (typeof o.updated_at !== "string") {
    throw new Error("invalid location row: updated_at");
  }

  return {
    id: o.id,
    name: o.name,
    code: (o.code as string | null) ?? null,
    notes: (o.notes as string | null) ?? null,
    archived_at: (o.archived_at as string | null) ?? null,
    updated_at: o.updated_at,
  };
}

async function throwForNotOk(res: Response, context: string): Promise<never> {
  const text = await res.text().catch(() => "");
  const statusText = res.statusText || "Unknown";
  throw new Error(
    `${context} (${res.status} ${statusText})${text ? `: ${text.slice(0, 200)}` : ""}`,
  );
}

function userHeaders(userId: number, includeJson = false): HeadersInit {
  if (includeJson) {
    return {
      "Content-Type": "application/json",
      "x-user-id": String(userId),
    };
  }
  return { "x-user-id": String(userId) };
}

export async function fetchLocations(
  args: FetchLocationsArgs,
  fetchImpl: FetchLike = (input, init) => globalThis.fetch(input, init),
): Promise<LocationListItem[]> {
  assertValidUserId(args.userId);
  const url = locationsUrl(args.baseUrl);
  url.searchParams.set("include_archived", args.includeArchived === true ? "1" : "0");

  let res: Response;
  try {
    res = await fetchImpl(url.toString(), {
      method: "GET",
      headers: userHeaders(args.userId),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not reach orchestrator: ${msg}`);
  }

  if (!res.ok) {
    await throwForNotOk(res, "Failed to load locations");
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    throw new Error("Locations response was not valid JSON");
  }

  if (!Array.isArray(raw)) {
    throw new Error("Locations response must be a JSON array");
  }

  return raw.map((row) => parseLocationRow(row));
}

export async function createLocation(
  args: CreateLocationArgs,
  fetchImpl: FetchLike = (input, init) => globalThis.fetch(input, init),
): Promise<LocationListItem> {
  assertValidUserId(args.userId);
  const url = locationsUrl(args.baseUrl);

  let res: Response;
  try {
    res = await fetchImpl(url.toString(), {
      method: "POST",
      headers: userHeaders(args.userId, true),
      body: JSON.stringify(toWritePayload(args.body)),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not reach orchestrator: ${msg}`);
  }

  if (!res.ok) {
    await throwForNotOk(res, "Failed to create location");
  }

  return parseLocationRow(await res.json());
}

export async function updateLocation(
  args: UpdateLocationArgs,
  fetchImpl: FetchLike = (input, init) => globalThis.fetch(input, init),
): Promise<LocationListItem> {
  assertValidUserId(args.userId);
  assertValidLocationId(args.locationId);
  const url = locationActionUrl(args.baseUrl, args.locationId);

  let res: Response;
  try {
    res = await fetchImpl(url.toString(), {
      method: "PATCH",
      headers: userHeaders(args.userId, true),
      body: JSON.stringify(toWritePayload(args.body)),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not reach orchestrator: ${msg}`);
  }

  if (!res.ok) {
    await throwForNotOk(res, "Failed to update location");
  }

  return parseLocationRow(await res.json());
}

export async function archiveLocation(
  args: ArchiveLocationArgs,
  fetchImpl: FetchLike = (input, init) => globalThis.fetch(input, init),
): Promise<LocationListItem> {
  assertValidUserId(args.userId);
  assertValidLocationId(args.locationId);
  const url = locationActionUrl(args.baseUrl, args.locationId, "archive");
  const reason = args.archiveReason?.trim();
  const hasReason = typeof reason === "string" && reason !== "";

  let res: Response;
  try {
    res = await fetchImpl(url.toString(), {
      method: "POST",
      headers: userHeaders(args.userId, hasReason),
      body: hasReason ? JSON.stringify({ reason }) : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not reach orchestrator: ${msg}`);
  }

  if (!res.ok) {
    await throwForNotOk(res, "Failed to archive location");
  }

  return parseLocationRow(await res.json());
}

export async function restoreLocation(
  args: RestoreLocationArgs,
  fetchImpl: FetchLike = (input, init) => globalThis.fetch(input, init),
): Promise<LocationListItem> {
  assertValidUserId(args.userId);
  assertValidLocationId(args.locationId);
  const url = locationActionUrl(args.baseUrl, args.locationId, "restore");

  let res: Response;
  try {
    res = await fetchImpl(url.toString(), {
      method: "POST",
      headers: userHeaders(args.userId),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not reach orchestrator: ${msg}`);
  }

  if (!res.ok) {
    await throwForNotOk(res, "Failed to restore location");
  }

  return parseLocationRow(await res.json());
}
