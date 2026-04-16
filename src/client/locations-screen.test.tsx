import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { GlobalWindow } from "happy-dom";
import type {
  ArchiveLocationArgs,
  FetchLike,
  FetchLocationsArgs,
  RestoreLocationArgs,
} from "./api/locations-client.ts";
import type { LocationListItem } from "../types/locations-api.ts";
import {
  DEFAULT_LOCATION_FORM,
  toLocationWritePayload,
  validateLocationForm,
} from "./lib/location-form.ts";
import { LocationDetailScreen } from "./location-detail-screen.tsx";
import { LocationsScreen } from "./locations-screen.tsx";

beforeAll(() => {
  const happyWindow = new GlobalWindow({ url: "http://localhost/" });
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
  globalThis.document = happyWindow.document as unknown as Document;
  globalThis.HTMLElement =
    happyWindow.HTMLElement as unknown as typeof globalThis.HTMLElement;
  globalThis.navigator = happyWindow.navigator as unknown as Navigator;
  globalThis.sessionStorage = happyWindow.sessionStorage;
});

beforeEach(() => {
  globalThis.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

type StubApi = {
  fetchLocations: (args: FetchLocationsArgs, fetchImpl?: FetchLike) => Promise<LocationListItem[]>;
  archiveLocation: (args: ArchiveLocationArgs, fetchImpl?: FetchLike) => Promise<LocationListItem>;
  restoreLocation: (args: RestoreLocationArgs, fetchImpl?: FetchLike) => Promise<LocationListItem>;
};

function makeApi(overrides?: Partial<StubApi>): StubApi {
  return {
    fetchLocations: async () => [],
    archiveLocation: async () => ({
      id: 1,
      name: "HQ",
      code: null,
      notes: null,
      archived_at: "2026-04-16T00:00:00.000Z",
      updated_at: "2026-04-16T00:00:00.000Z",
    }),
    restoreLocation: async () => ({
      id: 1,
      name: "HQ",
      code: null,
      notes: null,
      archived_at: null,
      updated_at: "2026-04-16T00:00:00.000Z",
    }),
    ...overrides,
  };
}

describe("LocationsScreen form validation", () => {
  test("form validation requires name and keeps optional fields mapped", () => {
    expect(DEFAULT_LOCATION_FORM.name).toBe("");

    const emptyErrors = validateLocationForm({
      name: "  ",
      code: "",
      notes: "",
    });
    expect(emptyErrors.name).toBe("Name is required.");
    expect(emptyErrors.code).toBeUndefined();
    expect(emptyErrors.notes).toBeUndefined();

    expect(
      toLocationWritePayload({
        name: "  Main Office  ",
        code: " HQ-001 ",
        notes: "  open weekdays ",
      }),
    ).toEqual({
      name: "Main Office",
      code: "HQ-001",
      notes: "open weekdays",
    });
  });
});

describe("LocationsScreen hub table", () => {
  test("hub table renders expected columns and archived toggle", async () => {
    const api = makeApi({
      fetchLocations: async () => [
        {
          id: 11,
          name: "HQ",
          code: "HQ-1",
          notes: null,
          archived_at: null,
          updated_at: "2026-04-16T00:00:00.000Z",
        },
      ],
    });

    const { getByText, getByLabelText } = render(
      <LocationsScreen baseUrl="http://localhost:3000" userId={7} onOpenLocation={() => {}} api={api} />,
    );

    await waitFor(() => {
      expect(getByText("Name")).toBeDefined();
    });
    expect(getByText("Status")).toBeDefined();
    expect(getByText("Updated")).toBeDefined();
    expect(getByText("Code")).toBeDefined();
    expect(getByText("Actions")).toBeDefined();
    expect(getByLabelText("Include archived")).toBeDefined();
  });

  test("shows loading, empty, populated, and error states with UI-SPEC copy", async () => {
    const pendingApi = makeApi({
      fetchLocations: async () => await new Promise<never>(() => {}),
    });
    const loadingView = render(
      <LocationsScreen
        baseUrl="http://localhost:3000"
        userId={7}
        onOpenLocation={() => {}}
        api={pendingApi}
      />,
    );
    expect(loadingView.getByText("Loading locations...")).toBeDefined();
    loadingView.unmount();

    const emptyApi = makeApi({
      fetchLocations: async () => [],
    });
    const emptyView = render(
      <LocationsScreen baseUrl="http://localhost:3000" userId={7} onOpenLocation={() => {}} api={emptyApi} />,
    );
    await waitFor(() => {
      expect(emptyView.getByText("No locations yet")).toBeDefined();
    });
    expect(
      emptyView.getByText(
        "Create your first location to organize devices, memberships, and event access.",
      ),
    ).toBeDefined();
    emptyView.unmount();

    const populatedApi = makeApi({
      fetchLocations: async () => [
        {
          id: 20,
          name: "Lab",
          code: "LAB-1",
          notes: null,
          archived_at: null,
          updated_at: "2026-04-16T00:00:00.000Z",
        },
      ],
    });
    const populatedView = render(
      <LocationsScreen
        baseUrl="http://localhost:3000"
        userId={7}
        onOpenLocation={() => {}}
        api={populatedApi}
      />,
    );
    await waitFor(() => {
      expect(populatedView.getByText("Lab")).toBeDefined();
    });
    populatedView.unmount();

    const errorApi = makeApi({
      fetchLocations: async () => {
        throw new Error("access denied: location 88");
      },
    });
    const errorView = render(
      <LocationsScreen baseUrl="http://localhost:3000" userId={7} onOpenLocation={() => {}} api={errorApi} />,
    );
    await waitFor(() => {
      expect(
        errorView.getByText("Could not load locations. Refresh and confirm the server is running."),
      ).toBeDefined();
    });
  });

  test("include archived toggle changes query and row/open navigation use same id", async () => {
    const includeArchivedCalls: boolean[] = [];
    const openCalls: number[] = [];
    const api = makeApi({
      fetchLocations: async ({ includeArchived }) => {
        includeArchivedCalls.push(includeArchived === true);
        return [
          {
            id: 44,
            name: "Warehouse",
            code: "WH-1",
            notes: null,
            archived_at: includeArchived ? "2026-04-16T00:00:00.000Z" : null,
            updated_at: "2026-04-16T00:00:00.000Z",
          },
        ];
      },
    });

    const { getByLabelText, getByText } = render(
      <LocationsScreen
        baseUrl="http://localhost:3000"
        userId={7}
        onOpenLocation={(locationId: number) => {
          openCalls.push(locationId);
        }}
        api={api}
      />,
    );

    await waitFor(() => {
      expect(getByText("Warehouse")).toBeDefined();
    });
    expect(includeArchivedCalls[0]).toBe(false);

    fireEvent.click(getByLabelText("Include archived"));
    await waitFor(() => {
      expect(includeArchivedCalls.length).toBe(2);
    });
    expect(includeArchivedCalls[1]).toBe(true);

    fireEvent.click(getByText("Warehouse"));
    fireEvent.click(getByText("Open"));
    expect(openCalls).toEqual([44, 44]);
  });

  test("archive confirmation calls archive handler with expected id", async () => {
    const archiveCalls: number[] = [];

    const originalConfirm = window.confirm;
    window.confirm = () => true;

    const api = makeApi({
      fetchLocations: async () => [
        {
          id: 50,
          name: "Office",
          code: null,
          notes: null,
          archived_at: null,
          updated_at: "2026-04-16T00:00:00.000Z",
        },
      ],
      archiveLocation: async ({ locationId }) => {
        archiveCalls.push(locationId);
        return {
          id: locationId,
          name: "Office",
          code: null,
          notes: null,
          archived_at: "2026-04-16T00:00:00.000Z",
          updated_at: "2026-04-16T00:00:00.000Z",
        };
      },
    });

    try {
      const { getByText } = render(
        <LocationsScreen
          baseUrl="http://localhost:3000"
          userId={7}
          onOpenLocation={() => {}}
          api={api}
        />,
      );

      await waitFor(() => {
        expect(getByText("Office")).toBeDefined();
      });
      fireEvent.click(getByText("Archive"));
      expect(archiveCalls).toEqual([50]);
    } finally {
      window.confirm = originalConfirm;
    }
  });

  test("restore action calls restore handler with expected id", async () => {
    globalThis.sessionStorage.setItem("locations.includeArchived", "1");
    const restoreCalls: number[] = [];
    const api = makeApi({
      fetchLocations: async () => [
        {
          id: 50,
          name: "Office",
          code: null,
          notes: null,
          archived_at: "2026-04-16T00:00:00.000Z",
          updated_at: "2026-04-16T00:00:00.000Z",
        },
      ],
      restoreLocation: async ({ locationId }) => {
        restoreCalls.push(locationId);
        return {
          id: locationId,
          name: "Office",
          code: null,
          notes: null,
          archived_at: null,
          updated_at: "2026-04-16T00:00:00.000Z",
        };
      },
    });

    const { getByText } = render(
      <LocationsScreen baseUrl="http://localhost:3000" userId={7} onOpenLocation={() => {}} api={api} />,
    );

    await waitFor(() => {
      expect(getByText("Restore location")).toBeDefined();
    });
    fireEvent.click(getByText("Restore location"));
    expect(restoreCalls).toEqual([50]);
  });
});

describe("LocationDetailScreen shared form", () => {
  test("shows Name is required. from shared form validation on submit", async () => {
    const onSubmitLocationCalls: Array<Record<string, unknown>> = [];
    const { getByText } = render(
      <LocationDetailScreen
        mode="create"
        onBackToLocations={() => {}}
        onSubmitLocation={async (payload) => {
          onSubmitLocationCalls.push(payload);
        }}
      />,
    );

    fireEvent.click(document.querySelector("button[type='submit']") as HTMLButtonElement);
    await waitFor(() => {
      expect(getByText("Name is required.")).toBeDefined();
    });
    expect(onSubmitLocationCalls).toEqual([]);
  });
});
