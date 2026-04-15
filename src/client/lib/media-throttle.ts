export const AUDIO_MIN_INTERVAL_MS = 3000;
export const VIDEO_MIN_INTERVAL_MS = 4000;

export type MediaThrottleState = {
  canEmitAudio: (nowMs: number) => boolean;
  markAudioEmitted: (nowMs: number) => void;
  canEmitVideo: (nowMs: number) => boolean;
  markVideoEmitted: (nowMs: number) => void;
};

export type CreateMediaThrottleStateOptions = {
  audioMinIntervalMs?: number;
  videoMinIntervalMs?: number;
};

export function createMediaThrottleState(
  options: CreateMediaThrottleStateOptions = {},
): MediaThrottleState {
  const audioMinIntervalMs = options.audioMinIntervalMs ?? AUDIO_MIN_INTERVAL_MS;
  const videoMinIntervalMs = options.videoMinIntervalMs ?? VIDEO_MIN_INTERVAL_MS;
  let lastAudioEmitMs: number | undefined;
  let lastVideoEmitMs: number | undefined;

  return {
    canEmitAudio: (nowMs) =>
      lastAudioEmitMs === undefined || nowMs - lastAudioEmitMs >= audioMinIntervalMs,
    markAudioEmitted: (nowMs) => {
      lastAudioEmitMs = nowMs;
    },
    canEmitVideo: (nowMs) =>
      lastVideoEmitMs === undefined || nowMs - lastVideoEmitMs >= videoMinIntervalMs,
    markVideoEmitted: (nowMs) => {
      lastVideoEmitMs = nowMs;
    },
  };
}
