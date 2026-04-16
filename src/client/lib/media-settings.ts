export type MediaDetectionSettings = {
  audioLevelBoost: number;
  audioThreshold: number;
  videoThreshold: number;
  videoCadenceMs: number;
  learningThreshold: number;
  detectionRules: DetectionRule[];
  notifications: NotificationSettings;
};

export type DetectionRuleKind = "keyword" | "action";

export type DetectionRuleScope = "global" | "location";

export type DetectionRule = {
  id: string;
  name: string;
  kind: DetectionRuleKind;
  pattern: string;
  minScore: number;
  cooldownMs: number;
  scope: DetectionRuleScope;
  locationId: number | null;
  notify: boolean;
  enabled: boolean;
};

export type NotificationSettings = {
  enabled: boolean;
};

const SETTINGS_KEY_V1 = "home-assist.media-settings.v1";
const SETTINGS_KEY_V2_BASE = "home-assist.media-settings.v2";

export const DEFAULT_MEDIA_DETECTION_SETTINGS: MediaDetectionSettings = {
  audioLevelBoost: 8,
  audioThreshold: 0.2,
  videoThreshold: 0.25,
  videoCadenceMs: 1000,
  learningThreshold: 0.65,
  detectionRules: [],
  notifications: {
    enabled: false,
  },
};

function keyForUser(userId?: number): string {
  const safeUserId = Number.isInteger(userId) && userId != null ? userId : 1;
  return `${SETTINGS_KEY_V2_BASE}.user.${safeUserId}`;
}

function parseRule(raw: unknown): DetectionRule | null {
  if (typeof raw !== "object" || raw == null) {
    return null;
  }
  const data = raw as Record<string, unknown>;
  if (
    typeof data.id !== "string" ||
    typeof data.pattern !== "string" ||
    typeof data.kind !== "string" ||
    typeof data.scope !== "string"
  ) {
    return null;
  }
  const kind = data.kind === "keyword" || data.kind === "action" ? data.kind : null;
  const scope = data.scope === "global" || data.scope === "location" ? data.scope : null;
  if (kind == null || scope == null) {
    return null;
  }
  return {
    id: data.id,
    name: typeof data.name === "string" ? data.name : data.pattern,
    kind,
    pattern: data.pattern.trim(),
    minScore:
      typeof data.minScore === "number"
        ? Math.max(0, Math.min(1, data.minScore))
        : kind === "keyword"
          ? 0.4
          : 0.65,
    cooldownMs:
      typeof data.cooldownMs === "number" && Number.isFinite(data.cooldownMs)
        ? Math.max(0, Math.round(data.cooldownMs))
        : 30_000,
    scope,
    locationId:
      scope === "location" && typeof data.locationId === "number" && Number.isInteger(data.locationId)
        ? data.locationId
        : null,
    notify: data.notify !== false,
    enabled: data.enabled !== false,
  };
}

export function loadMediaDetectionSettings(userId?: number): MediaDetectionSettings {
  if (typeof window === "undefined" || window.localStorage == null) {
    return DEFAULT_MEDIA_DETECTION_SETTINGS;
  }
  const raw =
    window.localStorage.getItem(keyForUser(userId)) ?? window.localStorage.getItem(SETTINGS_KEY_V1);
  if (!raw) {
    return DEFAULT_MEDIA_DETECTION_SETTINGS;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<MediaDetectionSettings>;
    const parsedRules = Array.isArray(parsed.detectionRules)
      ? parsed.detectionRules.map((entry) => parseRule(entry)).filter((entry) => entry != null)
      : [];
    return {
      audioLevelBoost:
        typeof parsed.audioLevelBoost === "number"
          ? parsed.audioLevelBoost
          : DEFAULT_MEDIA_DETECTION_SETTINGS.audioLevelBoost,
      audioThreshold:
        typeof parsed.audioThreshold === "number"
          ? parsed.audioThreshold
          : DEFAULT_MEDIA_DETECTION_SETTINGS.audioThreshold,
      videoThreshold:
        typeof parsed.videoThreshold === "number"
          ? parsed.videoThreshold
          : DEFAULT_MEDIA_DETECTION_SETTINGS.videoThreshold,
      videoCadenceMs:
        typeof parsed.videoCadenceMs === "number"
          ? parsed.videoCadenceMs
          : DEFAULT_MEDIA_DETECTION_SETTINGS.videoCadenceMs,
      learningThreshold:
        typeof parsed.learningThreshold === "number"
          ? parsed.learningThreshold
          : DEFAULT_MEDIA_DETECTION_SETTINGS.learningThreshold,
      detectionRules: parsedRules,
      notifications:
        typeof parsed.notifications === "object" &&
        parsed.notifications != null &&
        "enabled" in parsed.notifications
          ? {
              enabled:
                (parsed.notifications as { enabled?: unknown }).enabled === true,
            }
          : DEFAULT_MEDIA_DETECTION_SETTINGS.notifications,
    };
  } catch {
    return DEFAULT_MEDIA_DETECTION_SETTINGS;
  }
}

export function saveMediaDetectionSettings(settings: MediaDetectionSettings, userId?: number): void {
  if (typeof window === "undefined" || window.localStorage == null) {
    return;
  }
  window.localStorage.setItem(keyForUser(userId), JSON.stringify(settings));
}
