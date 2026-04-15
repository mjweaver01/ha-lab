export type MediaDetectionSettings = {
  audioLevelBoost: number;
  audioThreshold: number;
  videoThreshold: number;
  videoCadenceMs: number;
  learningThreshold: number;
};

const SETTINGS_KEY = "home-assist.media-settings.v1";

export const DEFAULT_MEDIA_DETECTION_SETTINGS: MediaDetectionSettings = {
  audioLevelBoost: 8,
  audioThreshold: 0.2,
  videoThreshold: 0.25,
  videoCadenceMs: 1000,
  learningThreshold: 0.65,
};

export function loadMediaDetectionSettings(): MediaDetectionSettings {
  if (typeof window === "undefined" || window.localStorage == null) {
    return DEFAULT_MEDIA_DETECTION_SETTINGS;
  }
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_MEDIA_DETECTION_SETTINGS;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<MediaDetectionSettings>;
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
    };
  } catch {
    return DEFAULT_MEDIA_DETECTION_SETTINGS;
  }
}

export function saveMediaDetectionSettings(settings: MediaDetectionSettings): void {
  if (typeof window === "undefined" || window.localStorage == null) {
    return;
  }
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
