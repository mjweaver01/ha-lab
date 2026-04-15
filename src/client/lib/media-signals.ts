import {
  buildAudioEventBody,
  buildVideoEventBody,
  MEDIA_AUDIO_EVENT_TYPE,
  MEDIA_VIDEO_EVENT_TYPE,
  type MediaCandidate,
} from "./media-event-types.ts";
import { createMediaThrottleState } from "./media-throttle.ts";

export type MediaSignalEvent = {
  event_type: "media.audio" | "media.video";
  body: unknown;
};

export type EmitMediaSignalEvent = (event: MediaSignalEvent) => Promise<void> | void;

export type MediaClassifierResult = {
  candidates?: readonly MediaCandidate[];
};

export type MediaSignalPipeline = {
  handleAudioClassification: (result: MediaClassifierResult) => Promise<boolean>;
  handleVideoClassification: (result: MediaClassifierResult) => Promise<boolean>;
};

export type CreateMediaSignalPipelineOptions = {
  homeId: number;
  emit: EmitMediaSignalEvent;
  nowMs?: () => number;
  audioThreshold?: number;
  videoThreshold?: number;
};

const DEFAULT_AUDIO_THRESHOLD = 0.65;
const DEFAULT_VIDEO_THRESHOLD = 0.65;

function pickTopCandidate(result: MediaClassifierResult): MediaCandidate | undefined {
  const candidates = result.candidates;
  if (!candidates || candidates.length === 0) {
    return undefined;
  }

  let top: MediaCandidate | undefined;
  for (const candidate of candidates) {
    const score = Number.isFinite(candidate.score) ? candidate.score : 0;
    if (!top || score > top.score) {
      top = { label: candidate.label, score };
    }
  }

  return top;
}

export function createMediaSignalPipeline({
  homeId,
  emit,
  nowMs = () => Date.now(),
  audioThreshold = DEFAULT_AUDIO_THRESHOLD,
  videoThreshold = DEFAULT_VIDEO_THRESHOLD,
}: CreateMediaSignalPipelineOptions): MediaSignalPipeline {
  const throttle = createMediaThrottleState();
  void homeId;

  return {
    async handleAudioClassification(result) {
      const top = pickTopCandidate(result);
      if (!top || top.score < audioThreshold) {
        return false;
      }

      const now = nowMs();
      if (!throttle.canEmitAudio(now)) {
        return false;
      }

      // Posting is classifier-driven only: no direct UI/meter-triggered emission (D-01).
      // Audio accepted cadence is 3s (3000ms) between emits (D-03).
      await emit({
        event_type: MEDIA_AUDIO_EVENT_TYPE,
        body: buildAudioEventBody(top.label, top.score, result.candidates),
      });
      throttle.markAudioEmitted(now);
      return true;
    },

    async handleVideoClassification(result) {
      const top = pickTopCandidate(result);
      if (!top || top.score < videoThreshold) {
        return false;
      }

      const now = nowMs();
      if (!throttle.canEmitVideo(now)) {
        return false;
      }

      // Video cadence stays inspectable: sample/classify continuously, emit at 4s (4000ms)+ accepted intervals (D-02, D-03).
      await emit({
        event_type: MEDIA_VIDEO_EVENT_TYPE,
        body: buildVideoEventBody(top.label, top.score, result.candidates),
      });
      throttle.markVideoEmitted(now);
      return true;
    },
  };
}
