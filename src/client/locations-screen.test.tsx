import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import {
  DEFAULT_LOCATION_FORM,
  toLocationWritePayload,
  validateLocationForm,
} from "./lib/location-form.ts";
import { LocationsScreen } from "./locations-screen.tsx";

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
  test("hub table renders expected columns and archived toggle", () => {
    const { getByText, getByLabelText } = render(
      <LocationsScreen
        baseUrl="http://localhost:3000"
        userId={7}
        onOpenLocation={() => {}}
      />,
    );

    expect(getByText("Name")).toBeDefined();
    expect(getByText("Status")).toBeDefined();
    expect(getByText("Updated")).toBeDefined();
    expect(getByText("Code")).toBeDefined();
    expect(getByText("Actions")).toBeDefined();
    expect(getByLabelText("Include archived")).toBeDefined();
  });
});
