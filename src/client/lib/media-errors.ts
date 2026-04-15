/**
 * User-facing strings for getUserMedia / MediaStream failures.
 * Copy aligns with `.planning/phases/05-local-media-capture/05-UI-SPEC.md`.
 */

function isDomException(err: unknown): err is DOMException {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    typeof (err as DOMException).name === "string"
  );
}

function blockedMessage(device: "mic" | "camera"): string {
  const deviceWord = device === "mic" ? "Microphone" : "Camera";
  return `${deviceWord} access was blocked. Allow access in your browser's site settings, or in System Settings → Privacy & Security → ${deviceWord} on macOS.`;
}

function notFoundMessage(device: "mic" | "camera"): string {
  const kind = device === "mic" ? "microphone" : "camera";
  return `No ${kind} was found. Check that a device is connected and not in use by another app.`;
}

function notReadableMessage(device: "mic" | "camera"): string {
  const kind = device === "mic" ? "microphone" : "camera";
  return `The ${kind} could not be read. Another app may be using it, or hardware may be unavailable.`;
}

/**
 * Shown when a track ends while capture was active (permission revoked, unplugged, etc.).
 */
export function formatTrackEndedMessage(device: "mic" | "camera"): string {
  const label = device === "mic" ? "Microphone" : "Camera";
  return `${label} was turned off or access was revoked. Allow access in your browser's site settings, or in System Settings → Privacy & Security → ${label} on macOS.`;
}

export function formatMediaError(device: "mic" | "camera", err: unknown): string {
  if (isDomException(err)) {
    switch (err.name) {
      case "NotAllowedError":
        return blockedMessage(device);
      case "NotFoundError":
        return notFoundMessage(device);
      case "NotReadableError":
      case "AbortError":
        return notReadableMessage(device);
      default:
        break;
    }
  }
  return notReadableMessage(device);
}
