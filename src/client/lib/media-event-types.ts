export const MEDIA_AUDIO_EVENT_TYPE = "media.audio";
export const MEDIA_VIDEO_EVENT_TYPE = "media.video";
export const MEDIA_TRANSCRIPT_EVENT_TYPE = "media.transcript";
export const MEDIA_VISION_EVENT_TYPE = "media.vision";

export type MediaCandidate = {
  label: string;
  score: number;
};

export type MediaEventBody = {
  top_label: string;
  top_score: number;
  candidates?: MediaCandidate[];
  source: "audio" | "video";
  transcript?: string;
  recognition_language?: string;
  transcript_confidence?: number;
};

export type MediaTranscriptEventBody = {
  source: "audio";
  transcript: string;
  confidence: number;
  recognition_language?: string;
  is_final: boolean;
};

export type MediaVisionEventBody = {
  source: "video";
  top_label: string;
  top_score: number;
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
  transcript?: string,
  recognitionLanguage?: string,
  transcriptConfidence?: number,
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
  if (transcript != null && transcript.trim() !== "") {
    body.transcript = transcript.trim();
  }
  if (recognitionLanguage != null && recognitionLanguage.trim() !== "") {
    body.recognition_language = recognitionLanguage.trim();
  }
  if (typeof transcriptConfidence === "number" && Number.isFinite(transcriptConfidence)) {
    body.transcript_confidence = clampScore(transcriptConfidence);
  }

  return body;
}

export function buildAudioEventBody(
  topLabel: string,
  topScore: number,
  candidates?: readonly MediaCandidate[],
  transcript?: string,
  recognitionLanguage?: string,
  transcriptConfidence?: number,
): MediaEventBody {
  return buildMediaEventBody(
    "audio",
    topLabel,
    topScore,
    candidates,
    transcript,
    recognitionLanguage,
    transcriptConfidence,
  );
}

export function buildVideoEventBody(
  topLabel: string,
  topScore: number,
  candidates?: readonly MediaCandidate[],
): MediaEventBody {
  return buildMediaEventBody("video", topLabel, topScore, candidates);
}

export function buildTranscriptEventBody(args: {
  transcript: string;
  confidence: number;
  recognitionLanguage?: string;
  isFinal: boolean;
}): MediaTranscriptEventBody {
  const body: MediaTranscriptEventBody = {
    source: "audio",
    transcript: args.transcript.trim(),
    confidence: clampScore(args.confidence),
    is_final: args.isFinal,
  };
  if (args.recognitionLanguage != null && args.recognitionLanguage.trim() !== "") {
    body.recognition_language = args.recognitionLanguage.trim();
  }
  return body;
}

export function buildVisionEventBody(
  topLabel: string,
  topScore: number,
  candidates?: readonly MediaCandidate[],
): MediaVisionEventBody {
  const body: MediaVisionEventBody = {
    source: "video",
    top_label: trimLabel(topLabel),
    top_score: clampScore(topScore),
  };
  const normalizedCandidates = normalizeCandidates(candidates);
  if (normalizedCandidates != null) {
    body.candidates = normalizedCandidates;
  }
  return body;
}
