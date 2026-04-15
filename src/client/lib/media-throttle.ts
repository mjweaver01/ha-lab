export const AUDIO_MIN_INTERVAL_MS = 3000;
export const VIDEO_MIN_INTERVAL_MS = 4000;

export type MediaThrottleState = {
  canEmitAudio: (nowMs: number) => boolean;
  markAudioEmitted: (nowMs: number) => void;
  canEmitVideo: (nowMs: number) => boolean;
  markVideoEmitted: (nowMs: number) => void;
};

export function createMediaThrottleState(): MediaThrottleState {
  let lastAudioEmitMs: number | undefined;
  let lastVideoEmitMs: number | undefined;

  return {
    canEmitAudio: (nowMs) =>
      lastAudioEmitMs === undefined || nowMs - lastAudioEmitMs >= AUDIO_MIN_INTERVAL_MS,
    markAudioEmitted: (nowMs) => {
      lastAudioEmitMs = nowMs;
    },
    canEmitVideo: (nowMs) =>
      lastVideoEmitMs === undefined || nowMs - lastVideoEmitMs >= VIDEO_MIN_INTERVAL_MS,
    markVideoEmitted: (nowMs) => {
      lastVideoEmitMs = nowMs;
    },
  };
}
