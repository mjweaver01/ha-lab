import { useMediaCapture } from "./hooks/use-media-capture.ts";

export function MediaCaptureSection() {
  const {
    micActive,
    cameraActive,
    micLevel,
    micError,
    cameraError,
    startMic,
    stopMic,
    startCamera,
    stopCamera,
    videoRef,
  } = useMediaCapture();

  return (
    <details className="media-capture events-panel">
      <summary className="media-capture__summary">Media capture</summary>
      <div className="media-capture__body">
        <div className="media-capture__block">
          <p className="media-capture__status">
            {micActive ? "Microphone on" : "Microphone off"}
          </p>
          <div className="media-capture__controls">
            <button
              type="button"
              className="events-btn"
              onClick={() => {
                if (micActive) stopMic();
                else void startMic();
              }}
            >
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
        </div>

        <div className="media-capture__block">
          <p className="media-capture__status">
            {cameraActive ? "Camera on" : "Camera off"}
          </p>
          <button
            type="button"
            className="events-btn"
            onClick={() => {
              if (cameraActive) stopCamera();
              else void startCamera();
            }}
          >
            {cameraActive ? "Stop camera" : "Start camera"}
          </button>
          {cameraActive ? (
            <video
              ref={videoRef}
              className="media-capture__video"
              playsInline
              muted
              autoPlay
              aria-label="Camera preview"
            />
          ) : null}
        </div>

        {micError != null || cameraError != null ? (
          <div className="events-error" role="alert">
            {micError != null ? <div>{micError}</div> : null}
            {cameraError != null ? <div>{cameraError}</div> : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}
