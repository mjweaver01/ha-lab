import { useEffect, useRef } from "react";
import type { EventListItem } from "../api/events-client.ts";
import { MEDIA_DETECTED_EVENT_TYPE } from "../lib/media-event-types.ts";

type DetectedNotificationBody = {
  source: "audio" | "video";
  rule_name: string;
  match_value: string;
  confidence: number | null;
  notify: boolean;
};

type UseDetectedEventNotificationsArgs = {
  events: readonly EventListItem[];
  newIds: ReadonlySet<number>;
  enabled: boolean;
  userId: number;
};

function parseDetectedNotificationBody(body: unknown): DetectedNotificationBody | null {
  if (typeof body !== "object" || body == null) {
    return null;
  }
  const data = body as Record<string, unknown>;
  if (data.source !== "audio" && data.source !== "video") {
    return null;
  }
  if (typeof data.rule_name !== "string" || typeof data.match_value !== "string") {
    return null;
  }
  const parsedConfidence =
    typeof data.confidence === "number" && Number.isFinite(data.confidence)
      ? data.confidence
      : typeof data.match_score === "number" && Number.isFinite(data.match_score)
        ? data.match_score
        : null;
  return {
    source: data.source,
    rule_name: data.rule_name,
    match_value: data.match_value,
    confidence: parsedConfidence,
    notify: data.notify === true,
  };
}

export function useDetectedEventNotifications({
  events,
  newIds,
  enabled,
  userId,
}: UseDetectedEventNotificationsArgs): void {
  const notifiedEventIdsRef = useRef(new Set<number>());

  useEffect(() => {
    const seenIds = notifiedEventIdsRef.current;
    const pendingEvents = events
      .filter((event) => newIds.has(event.id) && !seenIds.has(event.id))
      .sort((a, b) => a.id - b.id);

    if (pendingEvents.length === 0) {
      return;
    }

    for (const event of pendingEvents) {
      seenIds.add(event.id);
    }

    if (
      !enabled ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    for (const event of pendingEvents) {
      if (event.event_type !== MEDIA_DETECTED_EVENT_TYPE) {
        continue;
      }
      const payload = parseDetectedNotificationBody(event.body);
      if (payload == null || !payload.notify) {
        continue;
      }
      const title = payload.source === "audio" ? "Keyword detected" : "Action detected";
      const confidenceSuffix =
        payload.confidence == null ? "" : ` (${Math.round(payload.confidence * 100)}%)`;
      void new Notification(title, {
        body: `${payload.rule_name} • ${payload.match_value}${confidenceSuffix} • location ${event.location_id}`,
        tag: `ha-detected-${userId}-${event.id}`,
      });
    }
  }, [enabled, events, newIds, userId]);
}
