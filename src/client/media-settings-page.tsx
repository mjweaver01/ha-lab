import { useMemo, useState } from "react";
import { useMediaCapture } from "./hooks/use-media-capture.ts";
import {
  loadLearnedVideoSamples,
  saveLearnedVideoSamples,
  type LearnedVideoSample,
} from "./lib/media-learning.ts";
import type {
  DetectionRule,
  DetectionRuleKind,
  DetectionRuleScope,
  MediaDetectionSettings,
} from "./lib/media-settings.ts";

export type MediaSettingsPageProps = {
  settings: MediaDetectionSettings;
  onChangeSettings: (next: MediaDetectionSettings) => void;
  userId: number;
  onBackToEvents: () => void;
};

function byLabelCount(samples: readonly LearnedVideoSample[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const sample of samples) {
    counts.set(sample.label, (counts.get(sample.label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function MediaSettingsPage({
  settings,
  onChangeSettings,
  userId,
  onBackToEvents,
}: MediaSettingsPageProps) {
  const [learningLabel, setLearningLabel] = useState("");
  const [learningStatus, setLearningStatus] = useState<string | null>(null);
  const [learnedSamples, setLearnedSamples] = useState<LearnedVideoSample[]>(() =>
    loadLearnedVideoSamples(),
  );
  const [ruleKind, setRuleKind] = useState<DetectionRuleKind>("keyword");
  const [ruleScope, setRuleScope] = useState<DetectionRuleScope>("global");
  const [ruleName, setRuleName] = useState("");
  const [rulePattern, setRulePattern] = useState("");
  const [ruleLocationIdText, setRuleLocationIdText] = useState("");
  const [ruleMinScore, setRuleMinScore] = useState(0.65);
  const [ruleCooldownMs, setRuleCooldownMs] = useState(30_000);
  const [ruleNotify, setRuleNotify] = useState(true);
  const [ruleStatus, setRuleStatus] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>(() => {
    if (typeof Notification === "undefined") {
      return "unsupported";
    }
    return Notification.permission;
  });
  const learnedSummary = useMemo(() => byLabelCount(learnedSamples), [learnedSamples]);
  const { cameraActive, startCamera, stopCamera, captureVideoLearningSample, videoRef, videoDetection } =
    useMediaCapture({
      audioLevelBoost: settings.audioLevelBoost,
      audioActivityThreshold: settings.audioThreshold,
      videoActivityThreshold: settings.videoThreshold,
      videoSampleCadenceMs: settings.videoCadenceMs,
      learningMatchThreshold: settings.learningThreshold,
      learnedVideoSamples: learnedSamples,
      detectionRules: settings.detectionRules,
      notificationsEnabled: settings.notifications.enabled,
      userId,
    });

  const upsertLearningSample = (sample: LearnedVideoSample) => {
    const next = [...learnedSamples, sample].slice(-200);
    setLearnedSamples(next);
    saveLearnedVideoSamples(next);
  };

  const removeLearningLabel = (label: string) => {
    const next = learnedSamples.filter((sample) => sample.label !== label);
    setLearnedSamples(next);
    saveLearnedVideoSamples(next);
  };

  const upsertRule = (rule: DetectionRule) => {
    const next = [...settings.detectionRules.filter((entry) => entry.id !== rule.id), rule].slice(-300);
    onChangeSettings({
      ...settings,
      detectionRules: next,
    });
  };

  const removeRule = (ruleId: string) => {
    onChangeSettings({
      ...settings,
      detectionRules: settings.detectionRules.filter((rule) => rule.id !== ruleId),
    });
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification === "undefined") {
      setPermissionStatus("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
  };

  const sortedRules = useMemo(
    () =>
      [...settings.detectionRules].sort((a, b) => {
        if (a.scope !== b.scope) {
          return a.scope.localeCompare(b.scope);
        }
        if ((a.locationId ?? 0) !== (b.locationId ?? 0)) {
          return (a.locationId ?? 0) - (b.locationId ?? 0);
        }
        return a.name.localeCompare(b.name);
      }),
    [settings.detectionRules],
  );

  return (
    <div className="ui-page">
      <h1 className="ui-page-title">Media settings</h1>
      <p className="ui-page-meta">
        Tune capture behavior and teach custom labels from camera snapshots.
      </p>

      <div className="ui-panel media-capture__settings-grid">
        <label className="media-capture__field">
          <span>Audio meter sensitivity ({settings.audioLevelBoost.toFixed(1)}x)</span>
          <input
            type="range"
            min={1}
            max={20}
            step={0.5}
            value={settings.audioLevelBoost}
            onChange={(event) =>
              onChangeSettings({
                ...settings,
                audioLevelBoost: Number(event.currentTarget.value),
              })
            }
          />
        </label>
        <label className="media-capture__field">
          <span>Audio activity threshold ({settings.audioThreshold.toFixed(2)})</span>
          <input
            type="range"
            min={0.05}
            max={0.9}
            step={0.05}
            value={settings.audioThreshold}
            onChange={(event) =>
              onChangeSettings({
                ...settings,
                audioThreshold: Number(event.currentTarget.value),
              })
            }
          />
        </label>
        <label className="media-capture__field">
          <span>Video activity threshold ({settings.videoThreshold.toFixed(2)})</span>
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.05}
            value={settings.videoThreshold}
            onChange={(event) =>
              onChangeSettings({
                ...settings,
                videoThreshold: Number(event.currentTarget.value),
              })
            }
          />
        </label>
        <label className="media-capture__field">
          <span>Video sample cadence ({settings.videoCadenceMs}ms)</span>
          <input
            type="range"
            min={250}
            max={2000}
            step={50}
            value={settings.videoCadenceMs}
            onChange={(event) =>
              onChangeSettings({
                ...settings,
                videoCadenceMs: Number(event.currentTarget.value),
              })
            }
          />
        </label>
        <label className="media-capture__field">
          <span>Learning match threshold ({settings.learningThreshold.toFixed(2)})</span>
          <input
            type="range"
            min={0.35}
            max={0.95}
            step={0.05}
            value={settings.learningThreshold}
            onChange={(event) =>
              onChangeSettings({
                ...settings,
                learningThreshold: Number(event.currentTarget.value),
              })
            }
          />
        </label>
      </div>

      <div className="ui-panel media-capture__block">
        <h2 className="media-capture__subheading">Detection rules</h2>
        <p className="media-capture__learning-status">
          Add keyword or action rules with global or location scope. Matches emit{" "}
          <code>media.detected</code> events.
        </p>
        <div className="media-capture__settings-grid">
          <label className="media-capture__field">
            <span>Rule type</span>
            <select
              value={ruleKind}
              onChange={(event) => {
                const nextKind = event.currentTarget.value === "action" ? "action" : "keyword";
                setRuleKind(nextKind);
                setRuleMinScore(nextKind === "keyword" ? 0.4 : 0.65);
              }}
            >
              <option value="keyword">Keyword (microphone speech)</option>
              <option value="action">Action label (camera)</option>
            </select>
          </label>
          <label className="media-capture__field">
            <span>Scope</span>
            <select
              value={ruleScope}
              onChange={(event) => {
                setRuleScope(event.currentTarget.value === "location" ? "location" : "global");
              }}
            >
              <option value="global">Global</option>
              <option value="location">Specific location</option>
            </select>
          </label>
          {ruleScope === "location" ? (
            <label className="media-capture__field">
              <span>Location ID</span>
              <input
                type="number"
                min={1}
                step={1}
                value={ruleLocationIdText}
                onChange={(event) => {
                  setRuleLocationIdText(event.currentTarget.value);
                }}
              />
            </label>
          ) : null}
          <label className="media-capture__field">
            <span>Rule name</span>
            <input
              className="media-capture__input"
              value={ruleName}
              placeholder={ruleKind === "keyword" ? "Door open phrase" : "Person detected"}
              onChange={(event) => {
                setRuleName(event.currentTarget.value);
              }}
            />
          </label>
          <label className="media-capture__field">
            <span>{ruleKind === "keyword" ? "Phrase" : "Action label"}</span>
            <input
              className="media-capture__input"
              value={rulePattern}
              placeholder={ruleKind === "keyword" ? "help me" : "person"}
              onChange={(event) => {
                setRulePattern(event.currentTarget.value);
              }}
            />
          </label>
          <label className="media-capture__field">
            <span>Minimum confidence ({ruleMinScore.toFixed(2)})</span>
            <input
              type="range"
              min={0.1}
              max={0.95}
              step={0.05}
              value={ruleMinScore}
              onChange={(event) => {
                setRuleMinScore(Number(event.currentTarget.value));
              }}
            />
          </label>
          <label className="media-capture__field">
            <span>Cooldown ({Math.round(ruleCooldownMs / 1000)}s)</span>
            <input
              type="range"
              min={5000}
              max={180000}
              step={5000}
              value={ruleCooldownMs}
              onChange={(event) => {
                setRuleCooldownMs(Number(event.currentTarget.value));
              }}
            />
          </label>
          <label className="media-capture__checkbox">
            <input
              type="checkbox"
              checked={ruleNotify}
              onChange={(event) => {
                setRuleNotify(event.currentTarget.checked);
              }}
            />
            Notify device for this rule
          </label>
        </div>
        <div className="media-capture__controls">
          <button
            type="button"
            className="ui-btn"
            onClick={() => {
              setRuleStatus(null);
              const trimmedPattern = rulePattern.trim();
              if (trimmedPattern === "") {
                setRuleStatus("Enter a phrase or action label.");
                return;
              }
              const resolvedLocationId =
                ruleScope === "location"
                  ? Number.parseInt(ruleLocationIdText, 10)
                  : null;
              if (ruleScope === "location" && !Number.isInteger(resolvedLocationId)) {
                setRuleStatus("Enter a valid location ID for location-scoped rules.");
                return;
              }
              const id = `rule-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
              upsertRule({
                id,
                name: ruleName.trim() || trimmedPattern,
                kind: ruleKind,
                pattern: trimmedPattern,
                minScore: ruleMinScore,
                cooldownMs: ruleCooldownMs,
                scope: ruleScope,
                locationId: resolvedLocationId,
                notify: ruleNotify,
                enabled: true,
              });
              setRulePattern("");
              setRuleName("");
              setRuleStatus("Rule added.");
            }}
          >
            Add rule
          </button>
        </div>
        {ruleStatus != null ? <p className="media-capture__learning-status">{ruleStatus}</p> : null}
        {sortedRules.length > 0 ? (
          <ul className="media-capture__learned-list">
            {sortedRules.map((rule) => (
              <li key={rule.id} className="media-capture__rule-row">
                <div>
                  <div className="media-capture__rule-title">{rule.name}</div>
                  <div className="media-capture__rule-meta">
                    {rule.kind} · {rule.pattern} · min {rule.minScore.toFixed(2)} · cooldown{" "}
                    {Math.round(rule.cooldownMs / 1000)}s · {rule.scope}
                    {rule.scope === "location" && rule.locationId != null ? `:${rule.locationId}` : ""}
                  </div>
                </div>
                <div className="media-capture__rule-actions">
                  <label className="media-capture__checkbox">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) => {
                        upsertRule({
                          ...rule,
                          enabled: event.currentTarget.checked,
                        });
                      }}
                    />
                    Enabled
                  </label>
                  <label className="media-capture__checkbox">
                    <input
                      type="checkbox"
                      checked={rule.notify}
                      onChange={(event) => {
                        upsertRule({
                          ...rule,
                          notify: event.currentTarget.checked,
                        });
                      }}
                    />
                    Notify
                  </label>
                  <button
                    type="button"
                    className="ui-btn"
                    onClick={() => {
                      removeRule(rule.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="media-capture__learning-status">
            No detection rules yet. Add keyword/action rules to emit specific events.
          </p>
        )}
      </div>

      <div className="ui-panel media-capture__block">
        <h2 className="media-capture__subheading">Device notifications</h2>
        <p className="media-capture__learning-status">
          Notifications are per user and device. Current user ID: {userId}.
        </p>
        <div className="media-capture__controls">
          <label className="media-capture__checkbox">
            <input
              type="checkbox"
              checked={settings.notifications.enabled}
              onChange={(event) => {
                onChangeSettings({
                  ...settings,
                  notifications: {
                    enabled: event.currentTarget.checked,
                  },
                });
              }}
            />
            Enable device notifications for matched rules
          </label>
          <button type="button" className="ui-btn" onClick={() => void requestNotificationPermission()}>
            Request browser permission
          </button>
          <span className="media-capture__learning-status">Permission: {permissionStatus}</span>
        </div>
      </div>

      <div className="ui-panel media-capture__block">
        <p className="media-capture__status">
          {cameraActive ? "Camera learning preview on" : "Camera learning preview off"}
        </p>
        <div className="media-capture__controls">
          <button
            type="button"
            className="ui-btn"
            onClick={() => {
              if (cameraActive) stopCamera();
              else void startCamera();
            }}
          >
            {cameraActive ? "Stop camera preview" : "Start camera preview"}
          </button>
        </div>

        {cameraActive ? (
          <div className="media-capture__video-shell">
            <video
              ref={videoRef}
              className="media-capture__video"
              playsInline
              muted
              autoPlay
              aria-label="Learning camera preview"
            />
            {videoDetection != null ? (
              <div className="media-capture__video-overlay" aria-live="polite">
                <span className="media-capture__video-label">{videoDetection.label}</span>
                <span className="media-capture__video-score">
                  {Math.round(videoDetection.score * 100)}%
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="media-capture__learning">
          <p className="media-capture__learning-title">Teach custom labels from snapshots</p>
          <div className="media-capture__controls">
            <input
              className="media-capture__input"
              placeholder="Label (example: person, dog, truck)"
              value={learningLabel}
              onChange={(event) => setLearningLabel(event.currentTarget.value)}
            />
            <button
              type="button"
              className="ui-btn"
              onClick={() => {
                setLearningStatus(null);
                const label = learningLabel.trim();
                if (label === "") {
                  setLearningStatus("Enter a label before capturing.");
                  return;
                }
                const sample = captureVideoLearningSample(label);
                if (sample == null) {
                  setLearningStatus("Start camera preview first, then capture a sample.");
                  return;
                }
                upsertLearningSample(sample);
                setLearningStatus(`Captured sample for "${sample.label}".`);
              }}
            >
              Capture learning sample
            </button>
          </div>

          {learningStatus != null ? (
            <p className="media-capture__learning-status">{learningStatus}</p>
          ) : null}

          {learnedSummary.length > 0 ? (
            <ul className="media-capture__learned-list">
              {learnedSummary.map((entry) => (
                <li key={entry.label} className="media-capture__learned-row">
                  <span>
                    {entry.label} ({entry.count})
                  </span>
                  <button
                    type="button"
                    className="ui-btn"
                    onClick={() => {
                      removeLearningLabel(entry.label);
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="media-capture__learning-status">
              No custom labels yet. Capture samples while preview is running.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
