import { beforeAll, describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import { GlobalWindow } from "happy-dom";
import {
  DEFAULT_LOCATION_FORM,
  toLocationWritePayload,
  validateLocationForm,
} from "./lib/location-form.ts";
import { LocationsScreen } from "./locations-screen.tsx";

beforeAll(() => {
  const happyWindow = new GlobalWindow({ url: "http://localhost/" });
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
  globalThis.document = happyWindow.document;
  globalThis.HTMLElement = happyWindow.HTMLElement;
  globalThis.navigator = happyWindow.navigator;
  globalThis.sessionStorage = happyWindow.sessionStorage;
});

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
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify([
            {
              id: 11,
              name: "HQ",
              code: "HQ-1",
              notes: null,
              archived_at: null,
              updated_at: "2026-04-16T00:00:00.000Z",
            },
          ]),
          {
            status: 200,
            statusText: "OK",
            headers: { "Content-Type": "application/json" },
          },
        )) as typeof fetch;

      const { getByText, getByLabelText } = render(
        <LocationsScreen
          baseUrl="http://localhost:3000"
          userId={7}
          onOpenLocation={() => {}}
        />,
      );

      await waitFor(() => {
        expect(getByText("Name")).toBeDefined();
      });
      expect(getByText("Status")).toBeDefined();
      expect(getByText("Updated")).toBeDefined();
      expect(getByText("Code")).toBeDefined();
      expect(getByText("Actions")).toBeDefined();
      expect(getByLabelText("Include archived")).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
