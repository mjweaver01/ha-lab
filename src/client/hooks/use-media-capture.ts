import type { RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { postEvent } from "../api/events-client.ts";
import { formatMediaError, formatTrackEndedMessage } from "../lib/media-errors.ts";
import { createMediaSignalPipeline as createPipeline } from "../lib/media-signals.ts";
import { readPublicHomeId, readPublicOrchestratorUrl } from "../lib/public-env.ts";

const AUDIO_THROTTLE_MS = 3000;
const VIDEO_THROTTLE_MS = 4000;
const VIDEO_SAMPLE_CADENCE_MS = 1000;
const AUDIO_ACTIVITY_THRESHOLD = 0.2;
const VIDEO_ACTIVITY_THRESHOLD = 0.25;
const AUDIO_ACTIVE_LABEL = "speech";
const AUDIO_IDLE_LABEL = "ambient";
const VIDEO_ACTIVE_LABEL = "motion";
const VIDEO_IDLE_LABEL = "still";

export function useMediaCapture(): {
  micActive: boolean;
  cameraActive: boolean;
  micLevel: number;
  micError: string | null;
  cameraError: string | null;
  startMic: () => Promise<void>;
  stopMic: () => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
} {
  const [micActive, setMicActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micRafRef = useRef<number | null>(null);
  const cameraRafRef = useRef<number | null>(null);
  const lastVideoSampleMsRef = useRef(0);
  const signalPipelineRef = useRef<ReturnType<typeof createPipeline> | null>(null);
  const pipelineErrorRef = useRef({ mic: false, camera: false });

  const PUBLIC_HOME_ID = readPublicHomeId();
  const PUBLIC_ORCH_BASE_URL = readPublicOrchestratorUrl();

  const getSignalPipeline = useCallback(() => {
    if (signalPipelineRef.current != null) {
      return signalPipelineRef.current;
    }
    signalPipelineRef.current = createPipeline({
      homeId: PUBLIC_HOME_ID,
      audioThrottleMs: AUDIO_THROTTLE_MS,
      videoThrottleMs: VIDEO_THROTTLE_MS,
      emit: async ({ event_type, body }) => {
        await postEvent(PUBLIC_ORCH_BASE_URL, {
          home_id: PUBLIC_HOME_ID,
          event_type,
          body,
        });
      },
    });
    return signalPipelineRef.current;
  }, [PUBLIC_HOME_ID, PUBLIC_ORCH_BASE_URL]);

  const clearMicAnalysis = useCallback(() => {
    if (micRafRef.current != null) {
      cancelAnimationFrame(micRafRef.current);
      micRafRef.current = null;
    }
    analyserRef.current = null;
    const ctx = audioContextRef.current;
    audioContextRef.current = null;
    if (ctx != null && ctx.state !== "closed") {
      void ctx.close();
    }
    setMicLevel(0);
  }, []);

  const clearCameraSampling = useCallback(() => {
    if (cameraRafRef.current != null) {
      cancelAnimationFrame(cameraRafRef.current);
      cameraRafRef.current = null;
    }
    lastVideoSampleMsRef.current = 0;
  }, []);

  const reportPipelineError = useCallback((device: "mic" | "camera") => {
    const wasReported = pipelineErrorRef.current[device];
    pipelineErrorRef.current[device] = true;
    if (wasReported) {
      return;
    }
    const detail = "Media event delivery failed. Check orchestrator connectivity and try again.";
    if (device === "mic") {
      setMicError(detail);
      return;
    }
    setCameraError(detail);
  }, []);

  const stopMicTracks = useCallback(() => {
    const s = micStreamRef.current;
    micStreamRef.current = null;
    if (s != null) {
      for (const t of s.getTracks()) t.stop();
    }
    clearMicAnalysis();
    setMicActive(false);
  }, [clearMicAnalysis]);

  const stopCameraTracks = useCallback(() => {
    const s = cameraStreamRef.current;
    cameraStreamRef.current = null;
    clearCameraSampling();
    const v = videoRef.current;
    if (v != null) v.srcObject = null;
    if (s != null) {
      for (const t of s.getTracks()) t.stop();
    }
    setCameraActive(false);
  }, [clearCameraSampling]);

  const startMic = useCallback(async () => {
    setMicError(null);
    pipelineErrorRef.current.mic = false;
    stopMicTracks();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true },
        video: false,
      });
      micStreamRef.current = stream;
      for (const track of stream.getAudioTracks()) {
        track.onended = () => {
          setMicError(formatTrackEndedMessage("mic"));
          stopMicTracks();
        };
      }
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Float32Array(analyser.fftSize);
      const tick = () => {
        const a = analyserRef.current;
        if (a == null) return;
        a.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const x = buffer[i] ?? 0;
          sum += x * x;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const level = Math.min(1, rms * 4);
        setMicLevel(level);
        const score = level >= AUDIO_ACTIVITY_THRESHOLD ? level : 0;
        const label = score > 0 ? AUDIO_ACTIVE_LABEL : AUDIO_IDLE_LABEL;
        void getSignalPipeline()
          .handleAudioClassification({
            candidates: [{ label, score }],
          })
          .catch(() => {
            reportPipelineError("mic");
          });
        micRafRef.current = requestAnimationFrame(tick);
      };
      micRafRef.current = requestAnimationFrame(tick);
      setMicActive(true);
    } catch (e) {
      setMicError(formatMediaError("mic", e));
      clearMicAnalysis();
      setMicActive(false);
    }
  }, [stopMicTracks, clearMicAnalysis, getSignalPipeline, reportPipelineError]);

  const stopMic = useCallback(() => {
    setMicError(null);
    stopMicTracks();
  }, [stopMicTracks]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    pipelineErrorRef.current.camera = false;
    stopCameraTracks();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user" },
      });
      cameraStreamRef.current = stream;
      for (const track of stream.getVideoTracks()) {
        track.onended = () => {
          setCameraError(formatTrackEndedMessage("camera"));
          stopCameraTracks();
        };
      }
      setCameraActive(true);
      const el = videoRef.current;
      if (el != null) {
        el.srcObject = stream;
        void el.play().catch(() => {});
      }

      const sampleFrame = () => {
        const streamNow = cameraStreamRef.current;
        if (streamNow == null) {
          return;
        }
        const now = Date.now();
        // Sample cadence is 1000ms to keep frame classification timing inspectable (D-02).
        if (now - lastVideoSampleMsRef.current >= VIDEO_SAMPLE_CADENCE_MS) {
          lastVideoSampleMsRef.current = now;
          const hasVideoData =
            (videoRef.current?.videoWidth ?? 0) > 0 && (videoRef.current?.videoHeight ?? 0) > 0;
          const score = hasVideoData ? 0.9 : 0.8;
          const label = hasVideoData ? VIDEO_ACTIVE_LABEL : VIDEO_IDLE_LABEL;
          void getSignalPipeline()
            .handleVideoClassification({
              candidates: [{ label, score }],
            })
            .catch(() => {
              reportPipelineError("camera");
            });
        }
        cameraRafRef.current = requestAnimationFrame(sampleFrame);
      };
      cameraRafRef.current = requestAnimationFrame(sampleFrame);
    } catch (e) {
      setCameraError(formatMediaError("camera", e));
      setCameraActive(false);
    }
  }, [stopCameraTracks, getSignalPipeline, reportPipelineError]);

  const stopCamera = useCallback(() => {
    setCameraError(null);
    stopCameraTracks();
  }, [stopCameraTracks]);

  useLayoutEffect(() => {
    if (!cameraActive) return;
    const stream = cameraStreamRef.current;
    const el = videoRef.current;
    if (stream == null || el == null) return;
    el.srcObject = stream;
    void el.play().catch(() => {});
    return () => {
      el.srcObject = null;
    };
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      const ms = micStreamRef.current;
      const cs = cameraStreamRef.current;
      micStreamRef.current = null;
      cameraStreamRef.current = null;
      if (ms != null) {
        for (const t of ms.getTracks()) t.stop();
      }
      if (cs != null) {
        for (const t of cs.getTracks()) t.stop();
      }
      if (micRafRef.current != null) {
        cancelAnimationFrame(micRafRef.current);
        micRafRef.current = null;
      }
      if (cameraRafRef.current != null) {
        cancelAnimationFrame(cameraRafRef.current);
        cameraRafRef.current = null;
      }
      analyserRef.current = null;
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      if (ctx != null && ctx.state !== "closed") {
        void ctx.close();
      }
      const v = videoRef.current;
      if (v != null) v.srcObject = null;
    };
  }, []);

  return {
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
  };
}
