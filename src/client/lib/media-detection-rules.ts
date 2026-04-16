import type { DetectionRule } from "./media-settings.ts";
import type { MediaCandidate } from "./media-event-types.ts";

export type MediaRuleMatch = {
  rule: DetectionRule;
  matchedValue: string;
  score: number;
  source: "audio" | "video";
  candidates: MediaCandidate[];
  transcript?: string;
  recognitionLanguage?: string;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inScope(rule: DetectionRule, locationId: number): boolean {
  if (rule.scope === "global") {
    return true;
  }
  return rule.locationId === locationId;
}

function matchKeyword(transcript: string, phrase: string): boolean {
  const normalizedTranscript = normalizeText(transcript);
  const normalizedPhrase = normalizeText(phrase);
  if (normalizedTranscript === "" || normalizedPhrase === "") {
    return false;
  }
  const haystack = normalizedTranscript.split(" ");
  const needle = normalizedPhrase.split(" ");
  if (needle.length > haystack.length) {
    return false;
  }
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let same = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        same = false;
        break;
      }
    }
    if (same) {
      return true;
    }
  }
  return false;
}

export function evaluateKeywordRules(args: {
  rules: readonly DetectionRule[];
  transcript: string;
  confidence: number;
  locationId: number;
  recognitionLanguage?: string;
}): MediaRuleMatch[] {
  const out: MediaRuleMatch[] = [];
  const safeConfidence = Number.isFinite(args.confidence)
    ? Math.max(0, Math.min(1, args.confidence))
    : 0;
  for (const rule of args.rules) {
    if (!rule.enabled || rule.kind !== "keyword" || !inScope(rule, args.locationId)) {
      continue;
    }
    if (safeConfidence < rule.minScore) {
      continue;
    }
    if (!matchKeyword(args.transcript, rule.pattern)) {
      continue;
    }
    out.push({
      rule,
      matchedValue: args.transcript.trim(),
      score: safeConfidence,
      source: "audio",
      candidates: [{ label: args.transcript.trim(), score: safeConfidence }],
      transcript: args.transcript.trim(),
      recognitionLanguage: args.recognitionLanguage?.trim() || undefined,
    });
  }
  return out;
}

export function evaluateActionRules(args: {
  rules: readonly DetectionRule[];
  candidates: readonly MediaCandidate[];
  locationId: number;
}): MediaRuleMatch[] {
  const out: MediaRuleMatch[] = [];
  for (const rule of args.rules) {
    if (!rule.enabled || rule.kind !== "action" || !inScope(rule, args.locationId)) {
      continue;
    }
    const match = args.candidates.find(
      (candidate) =>
        candidate.label.trim().toLowerCase() === rule.pattern.trim().toLowerCase() &&
        candidate.score >= rule.minScore,
    );
    if (!match) {
      continue;
    }
    out.push({
      rule,
      matchedValue: match.label,
      score: match.score,
      source: "video",
      candidates: args.candidates.map((candidate) => ({
        label: candidate.label,
        score: candidate.score,
      })),
    });
  }
  return out;
}
