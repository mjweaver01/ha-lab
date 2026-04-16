export const MEDIA_AUDIO_EVENT_TYPE = "media.audio";
export const MEDIA_VIDEO_EVENT_TYPE = "media.video";
export const MEDIA_DETECTED_EVENT_TYPE = "media.detected";

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

export type MediaDetectedEventBody = {
  source: "audio" | "video";
  rule_id: string;
  rule_name: string;
  rule_kind: "keyword" | "action";
  rule_scope: "global" | "location";
  rule_location_id: number | null;
  match_value: string;
  match_score: number;
  notify: boolean;
  candidates?: MediaCandidate[];
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

export function buildDetectedEventBody(args: {
  source: "audio" | "video";
  ruleId: string;
  ruleName: string;
  ruleKind: "keyword" | "action";
  ruleScope: "global" | "location";
  ruleLocationId: number | null;
  matchValue: string;
  matchScore: number;
  notify: boolean;
  candidates?: readonly MediaCandidate[];
}): MediaDetectedEventBody {
  const body: MediaDetectedEventBody = {
    source: args.source,
    rule_id: args.ruleId.trim(),
    rule_name: trimLabel(args.ruleName),
    rule_kind: args.ruleKind,
    rule_scope: args.ruleScope,
    rule_location_id: args.ruleLocationId,
    match_value: trimLabel(args.matchValue),
    match_score: clampScore(args.matchScore),
    notify: args.notify,
  };
  const normalizedCandidates = normalizeCandidates(args.candidates);
  if (normalizedCandidates != null) {
    body.candidates = normalizedCandidates;
  }
  return body;
}
