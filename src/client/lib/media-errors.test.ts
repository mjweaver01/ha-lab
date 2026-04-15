import { describe, expect, test } from "bun:test";
import { formatMediaError, formatTrackEndedMessage } from "./media-errors.ts";

describe("formatMediaError", () => {
  test("NotAllowedError mic — blocked copy + remediation", () => {
    const err = new DOMException("denied", "NotAllowedError");
    const s = formatMediaError("mic", err);
    expect(s.startsWith("Microphone access was blocked")).toBe(true);
    expect(s).toContain("System Settings");
    expect(s).toContain("Privacy & Security");
    expect(s).toContain("Microphone");
  });

  test("NotAllowedError camera — blocked copy + remediation", () => {
    const err = new DOMException("denied", "NotAllowedError");
    const s = formatMediaError("camera", err);
    expect(s.startsWith("Camera access was blocked")).toBe(true);
    expect(s).toContain("System Settings");
    expect(s).toContain("Privacy & Security");
    expect(s).toContain("Camera");
  });

  test("NotFoundError mic", () => {
    const err = new DOMException("none", "NotFoundError");
    expect(formatMediaError("mic", err)).toBe(
      "No microphone was found. Check that a device is connected and not in use by another app.",
    );
  });

  test("unknown Error falls back to not-readable style", () => {
    expect(formatMediaError("mic", new Error("oops"))).toContain("microphone");
    expect(formatMediaError("camera", "string")).toContain("camera");
  });
});

describe("formatTrackEndedMessage", () => {
  test("mic", () => {
    expect(formatTrackEndedMessage("mic")).toContain("Microphone was turned off or access was revoked");
  });
});
