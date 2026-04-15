import { useMemo, useState } from "react";
import { useMediaCapture } from "./hooks/use-media-capture.ts";
import {
  loadLearnedVideoSamples,
  saveLearnedVideoSamples,
  type LearnedVideoSample,
} from "./lib/media-learning.ts";
import type { MediaDetectionSettings } from "./lib/media-settings.ts";

export type MediaSettingsPageProps = {
  settings: MediaDetectionSettings;
  onChangeSettings: (next: MediaDetectionSettings) => void;
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
  onBackToEvents,
}: MediaSettingsPageProps) {
  const [learningLabel, setLearningLabel] = useState("");
  const [learningStatus, setLearningStatus] = useState<string | null>(null);
  const [learnedSamples, setLearnedSamples] = useState<LearnedVideoSample[]>(() =>
    loadLearnedVideoSamples(),
  );
  const learnedSummary = useMemo(() => byLabelCount(learnedSamples), [learnedSamples]);
  const { cameraActive, startCamera, stopCamera, captureVideoLearningSample, videoRef, videoDetection } =
    useMediaCapture({
      audioLevelBoost: settings.audioLevelBoost,
      audioActivityThreshold: settings.audioThreshold,
      videoActivityThreshold: settings.videoThreshold,
      videoSampleCadenceMs: settings.videoCadenceMs,
      learningMatchThreshold: settings.learningThreshold,
      learnedVideoSamples: learnedSamples,
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

  return (
    <div className="events-page">
      <div className="events-toolbar">
        <button type="button" className="events-btn" onClick={onBackToEvents}>
          Back to events
        </button>
      </div>
      <h1 className="events-page__title">Media settings</h1>
      <p className="events-page__meta">
        Tune capture behavior and teach custom labels from camera snapshots.
      </p>

      <div className="events-panel media-capture__settings-grid">
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

      <div className="events-panel media-capture__block">
        <p className="media-capture__status">
          {cameraActive ? "Camera learning preview on" : "Camera learning preview off"}
        </p>
        <div className="media-capture__controls">
          <button
            type="button"
            className="events-btn"
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
              className="events-btn"
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
                    className="events-btn"
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
