import { describe, expect, test } from "bun:test";
import {
  evaluateActionRules,
  evaluateKeywordRules,
} from "./media-detection-rules.ts";
import type { DetectionRule } from "./media-settings.ts";

function makeRule(overrides: Partial<DetectionRule>): DetectionRule {
  return {
    id: "rule-1",
    name: "test rule",
    kind: "keyword",
    pattern: "help me",
    minScore: 0.5,
    cooldownMs: 30_000,
    scope: "global",
    locationId: null,
    notify: true,
    enabled: true,
    ...overrides,
  };
}

describe("media detection rules", () => {
  test("keyword rules match exact phrase words", () => {
    const rules = [makeRule({ pattern: "help me", kind: "keyword", minScore: 0.4 })];
    const matches = evaluateKeywordRules({
      rules,
      transcript: "Can you help me please",
      confidence: 0.7,
      locationId: 12,
      recognitionLanguage: "fr-FR",
    });
    expect(matches).toHaveLength(1);
    expect(matches[0]?.rule.id).toBe("rule-1");
    expect(matches[0]?.transcript).toBe("Can you help me please");
    expect(matches[0]?.recognitionLanguage).toBe("fr-FR");
  });

  test("location-scoped rule only matches same location", () => {
    const rules = [
      makeRule({
        id: "loc-rule",
        kind: "action",
        pattern: "person",
        minScore: 0.6,
        scope: "location",
        locationId: 9,
      }),
    ];
    const miss = evaluateActionRules({
      rules,
      candidates: [{ label: "person", score: 0.8 }],
      locationId: 4,
    });
    expect(miss).toHaveLength(0);
    const hit = evaluateActionRules({
      rules,
      candidates: [{ label: "person", score: 0.8 }],
      locationId: 9,
    });
    expect(hit).toHaveLength(1);
  });
});
