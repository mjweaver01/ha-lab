import { useMemo } from "react";
import { Camera, ChevronDown, Mic, Square } from "lucide-react";
import {
  type UseMediaCaptureOptions,
  useMediaCapture,
} from "./hooks/use-media-capture.ts";
import { loadLearnedVideoSamples } from "./lib/media-learning.ts";

export type MediaCaptureSectionProps = {
  settings: UseMediaCaptureOptions;
};

export function MediaCaptureSection({ settings }: MediaCaptureSectionProps) {
  const learnedVideoSamples = useMemo(() => loadLearnedVideoSamples(), []);
  const {
    micActive,
    cameraActive,
    micLevel,
    micError,
    cameraError,
    audioDetection,
    videoDetection,
    startMic,
    stopMic,
    startCamera,
    stopCamera,
    videoRef,
  } = useMediaCapture({
    ...settings,
    learnedVideoSamples,
  });

  return (
    <details className="media-capture ui-panel">
      <summary className="media-capture__summary">
        <span className="media-capture__summary-content">
          <span className="media-capture__summary-main">
            <Camera size={16} aria-hidden />
            <span>Media capture</span>
          </span>
          <span className="media-capture__summary-caret" aria-hidden>
            <ChevronDown size={14} />
          </span>
        </span>
      </summary>
      <div className="media-capture__body">
        <div className="media-capture__block">
          <p className="media-capture__status">
            {micActive ? "Microphone on" : "Microphone off"}
          </p>
          <div className="media-capture__controls">
            <button
              type="button"
              className="ui-btn ui-btn--with-icon"
              onClick={() => {
                if (micActive) stopMic();
                else void startMic();
              }}
            >
              <span className="ui-btn__icon" aria-hidden>
                {micActive ? <Square size={14} /> : <Mic size={16} />}
              </span>
              {micActive ? "Stop microphone" : "Start microphone"}
            </button>
            {micActive ? (
              <div
                className="media-capture__meter"
                aria-hidden
                title="Microphone level"
              >
                <div
                  className="media-capture__meter-fill"
                  style={{ width: `${Math.round(micLevel * 100)}%` }}
                />
              </div>
            ) : null}
          </div>
          {audioDetection != null ? (
            <p className="media-capture__detection">
              Audio detection: <strong>{audioDetection.label}</strong> (
              {Math.round(audioDetection.score * 100)}%)
            </p>
          ) : null}
        </div>

        <div className="media-capture__block">
          <p className="media-capture__status">
            {cameraActive ? "Camera on" : "Camera off"}
          </p>
          <button
            type="button"
            className="ui-btn ui-btn--with-icon"
            onClick={() => {
              if (cameraActive) stopCamera();
              else void startCamera();
            }}
          >
            <span className="ui-btn__icon" aria-hidden>
              {cameraActive ? <Square size={14} /> : <Camera size={16} />}
            </span>
            {cameraActive ? "Stop camera" : "Start camera"}
          </button>
          {cameraActive ? (
            <div className="media-capture__video-shell">
              <video
                ref={videoRef}
                className="media-capture__video"
                playsInline
                muted
                autoPlay
                aria-label="Camera preview"
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
          {videoDetection != null ? (
            <p className="media-capture__detection">
              Video detection: <strong>{videoDetection.label}</strong> (
              {Math.round(videoDetection.score * 100)}%)
            </p>
          ) : null}
        </div>

        {micError != null || cameraError != null ? (
          <div className="ui-alert ui-alert--error" role="alert">
            {micError != null ? <div>{micError}</div> : null}
            {cameraError != null ? <div>{cameraError}</div> : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}
