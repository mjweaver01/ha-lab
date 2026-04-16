import { useEffect, useRef } from "react";
import type { EventListItem } from "../api/events-client.ts";
import {
  MEDIA_AUDIO_EVENT_TYPE,
  MEDIA_TRANSCRIPT_EVENT_TYPE,
  MEDIA_VIDEO_EVENT_TYPE,
  MEDIA_VISION_EVENT_TYPE,
  type MediaCandidate,
} from "../lib/media-event-types.ts";
import {
  evaluateActionRules,
  evaluateKeywordRules,
  type MediaRuleMatch,
} from "../lib/media-detection-rules.ts";
import type { DetectionRule } from "../lib/media-settings.ts";

type UseDetectedEventNotificationsArgs = {
  events: readonly EventListItem[];
  newIds: ReadonlySet<number>;
  enabled: boolean;
  userId: number;
  detectionRules?: readonly DetectionRule[];
  locationNamesById?: ReadonlyMap<number, string>;
};

type TranscriptBody = {
  transcript: string;
  confidence: number;
  recognition_language?: string;
};

function inScope(rule: DetectionRule, locationId: number): boolean {
  if (rule.scope === "global") {
    return true;
  }
  return rule.locationId === locationId;
}

function parseTranscriptBody(body: unknown): TranscriptBody | null {
  if (typeof body !== "object" || body == null) {
    return null;
  }
  const data = body as Record<string, unknown>;
  if (typeof data.transcript !== "string" || data.transcript.trim() === "") {
    return null;
  }
  const confidence =
    typeof data.confidence === "number" && Number.isFinite(data.confidence) ? data.confidence : 0;
  return {
    transcript: data.transcript.trim(),
    confidence,
    recognition_language:
      typeof data.recognition_language === "string" ? data.recognition_language : undefined,
  };
}

function parseAudioTranscriptBody(body: unknown): TranscriptBody | null {
  if (typeof body !== "object" || body == null) {
    return null;
  }
  const data = body as Record<string, unknown>;
  if (typeof data.transcript !== "string" || data.transcript.trim() === "") {
    return null;
  }
  const rawConfidence =
    typeof data.transcript_confidence === "number" && Number.isFinite(data.transcript_confidence)
      ? data.transcript_confidence
      : typeof data.confidence === "number" && Number.isFinite(data.confidence)
        ? data.confidence
        : 0;
  return {
    transcript: data.transcript.trim(),
    confidence: rawConfidence,
    recognition_language:
      typeof data.recognition_language === "string" ? data.recognition_language : undefined,
  };
}

function parseVisionCandidates(body: unknown): MediaCandidate[] {
  if (typeof body !== "object" || body == null) {
    return [];
  }
  const data = body as Record<string, unknown>;
  const rawCandidates = Array.isArray(data.candidates) ? data.candidates : [];
  const candidates = rawCandidates
    .map((item) => {
      if (typeof item !== "object" || item == null) {
        return null;
      }
      const c = item as Record<string, unknown>;
      if (typeof c.label !== "string" || typeof c.score !== "number" || !Number.isFinite(c.score)) {
        return null;
      }
      return { label: c.label, score: c.score };
    })
    .filter((item): item is MediaCandidate => item != null);
  if (candidates.length > 0) {
    return candidates;
  }
  if (typeof data.top_label === "string" && typeof data.top_score === "number") {
    return [{ label: data.top_label, score: data.top_score }];
  }
  return [];
}

function shouldNotifyRuleMatch(match: MediaRuleMatch): boolean {
  return match.rule.enabled === true && match.rule.notify === true;
}

function notificationFromRuleMatch(match: MediaRuleMatch, locationLabel: string) {
  const title = match.source === "audio" ? "Keyword detected" : "Action detected";
  const confidenceSuffix = ` (${Math.round(match.score * 100)}%)`;
  return {
    title,
    body: `${match.rule.name} • ${match.matchedValue}${confidenceSuffix} • ${locationLabel}`,
  };
}

function dispatchNotification(title: string, body: string, tag: string): void {
  try {
    void new Notification(title, { body, tag });
  } catch {
    // Ignore browser-level notification errors for resilience.
  }
}

export function useDetectedEventNotifications({
  events,
  newIds,
  enabled,
  userId,
  detectionRules = [],
  locationNamesById = new Map<number, string>(),
}: UseDetectedEventNotificationsArgs): void {
  const notifiedEventIdsRef = useRef(new Set<number>());
  const ruleCooldownRef = useRef(new Map<string, number>());
  const maxObservedEventIdRef = useRef<number | null>(null);
  const mountedAtMsRef = useRef(Date.now());

  useEffect(() => {
    const seenIds = notifiedEventIdsRef.current;
    const maxSeen = maxObservedEventIdRef.current;
    let pendingEvents: EventListItem[] = [];
    if (maxSeen == null) {
      if (events.length === 0) {
        return;
      }
      const firstBatchMaxId = Math.max(...events.map((event) => event.id));
      maxObservedEventIdRef.current = firstBatchMaxId;
      // First fetch should not replay old history, but should still allow
      // very recent cross-browser events that arrive during page startup.
      const recentCutoffMs = mountedAtMsRef.current - 3_000;
      pendingEvents = events
        .filter((event) => {
          const createdAtMs = Date.parse(event.created_at);
          return Number.isFinite(createdAtMs) && createdAtMs >= recentCutoffMs && !seenIds.has(event.id);
        })
        .sort((a, b) => a.id - b.id);
    } else {
      pendingEvents = events
        .filter((event) => event.id > maxSeen && !seenIds.has(event.id))
        .sort((a, b) => a.id - b.id);
      if (pendingEvents.length === 0 && newIds.size > 0) {
        pendingEvents = events
          .filter((event) => newIds.has(event.id) && !seenIds.has(event.id))
          .sort((a, b) => a.id - b.id);
      }
    }

    if (pendingEvents.length === 0) {
      return;
    }

    if (
      !enabled ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    for (const event of pendingEvents) {
      const locationLabel = locationNamesById.get(event.location_id) ?? `Location ${event.location_id}`;
      if (
        event.event_type === MEDIA_TRANSCRIPT_EVENT_TYPE ||
        event.event_type === MEDIA_AUDIO_EVENT_TYPE
      ) {
        const transcript =
          event.event_type === MEDIA_TRANSCRIPT_EVENT_TYPE
            ? parseTranscriptBody(event.body)
            : parseAudioTranscriptBody(event.body);
        if (transcript == null) {
          continue;
        }
        const matches = evaluateKeywordRules({
          rules: detectionRules.filter(
            (rule) => rule.kind === "keyword" && inScope(rule, event.location_id),
          ),
          transcript: transcript.transcript,
          confidence: transcript.confidence,
          locationId: event.location_id,
          recognitionLanguage: transcript.recognition_language,
        }).filter(shouldNotifyRuleMatch);

        for (const match of matches) {
          const key = `${event.location_id}:${match.rule.id}:${match.matchedValue.toLowerCase()}`;
          const last = ruleCooldownRef.current.get(key) ?? 0;
          const now = Date.now();
          if (now - last < match.rule.cooldownMs) {
            continue;
          }
          ruleCooldownRef.current.set(key, now);
          const msg = notificationFromRuleMatch(match, locationLabel);
          dispatchNotification(
            msg.title,
            msg.body,
            `ha-rule-${userId}-${event.location_id}-${match.rule.id}-${event.id}`,
          );
        }
        seenIds.add(event.id);
        continue;
      }

      if (event.event_type === MEDIA_VISION_EVENT_TYPE || event.event_type === MEDIA_VIDEO_EVENT_TYPE) {
        const candidates = parseVisionCandidates(event.body);
        if (candidates.length === 0) {
          seenIds.add(event.id);
          continue;
        }
        const matches = evaluateActionRules({
          rules: detectionRules.filter(
            (rule) => rule.kind === "action" && inScope(rule, event.location_id),
          ),
          candidates,
          locationId: event.location_id,
        }).filter(shouldNotifyRuleMatch);

        for (const match of matches) {
          const key = `${event.location_id}:${match.rule.id}:${match.matchedValue.toLowerCase()}`;
          const last = ruleCooldownRef.current.get(key) ?? 0;
          const now = Date.now();
          if (now - last < match.rule.cooldownMs) {
            continue;
          }
          ruleCooldownRef.current.set(key, now);
          const msg = notificationFromRuleMatch(match, locationLabel);
          dispatchNotification(
            msg.title,
            msg.body,
            `ha-rule-${userId}-${event.location_id}-${match.rule.id}-${event.id}`,
          );
        }
        seenIds.add(event.id);
        continue;
      }
      seenIds.add(event.id);
    }
    const maxProcessedId = pendingEvents[pendingEvents.length - 1]?.id ?? 0;
    const maxSeenSafe = maxSeen ?? 0;
    if (maxProcessedId > maxSeenSafe) {
      maxObservedEventIdRef.current = maxProcessedId;
    }
  }, [detectionRules, enabled, events, locationNamesById, newIds, userId]);
}
