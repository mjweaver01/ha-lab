import { describe, expect, test } from "bun:test";
import {
  DEFAULT_LOCATION_FORM,
  toLocationWritePayload,
  validateLocationForm,
} from "./lib/location-form.ts";

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
