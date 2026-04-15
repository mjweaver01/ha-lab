export const MEDIA_AUDIO_EVENT_TYPE = "media.audio";
export const MEDIA_VIDEO_EVENT_TYPE = "media.video";

export type MediaCandidate = {
  label: string;
  score: number;
};

export type MediaEventBody = {
  top_label: string;
  top_score: number;
  candidates?: MediaCandidate[];
  source: "audio" | "video";
};

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  if (score < 0) {
    return 0;
  }
  if (score > 1) {
    return 1;
  }
  return score;
}

function trimLabel(label: string): string {
  const trimmed = label.trim();
  return trimmed || "unknown";
}

function normalizeCandidates(
  candidates: readonly MediaCandidate[] | undefined,
): MediaCandidate[] | undefined {
  if (!candidates || candidates.length === 0) {
    return undefined;
  }

  const normalized = candidates.map((candidate) => ({
    label: trimLabel(candidate.label),
    score: clampScore(candidate.score),
  }));

  return normalized.length > 0 ? normalized : undefined;
}

function buildMediaEventBody(
  source: "audio" | "video",
  topLabel: string,
  topScore: number,
  candidates?: readonly MediaCandidate[],
): MediaEventBody {
  const normalizedCandidates = normalizeCandidates(candidates);
  const body: MediaEventBody = {
    source,
    top_label: trimLabel(topLabel),
    top_score: clampScore(topScore),
  };

  if (normalizedCandidates) {
    body.candidates = normalizedCandidates;
  }

  return body;
}

export function buildAudioEventBody(
  topLabel: string,
  topScore: number,
  candidates?: readonly MediaCandidate[],
): MediaEventBody {
  return buildMediaEventBody("audio", topLabel, topScore, candidates);
}

export function buildVideoEventBody(
  topLabel: string,
  topScore: number,
  candidates?: readonly MediaCandidate[],
): MediaEventBody {
  return buildMediaEventBody("video", topLabel, topScore, candidates);
}
