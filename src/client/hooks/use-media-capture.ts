import type { RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { postEvent } from "../api/events-client.ts";
import {
  evaluateActionRules,
  evaluateKeywordRules,
  type MediaRuleMatch,
} from "../lib/media-detection-rules.ts";
import {
  buildDetectedEventBody,
  MEDIA_DETECTED_EVENT_TYPE,
  type MediaCandidate,
} from "../lib/media-event-types.ts";
import {
  createLearnedVideoSample,
  createVideoFrameFeature,
  matchLearnedVideoLabel,
  type LearnedVideoSample,
} from "../lib/media-learning.ts";
import { formatMediaError, formatTrackEndedMessage } from "../lib/media-errors.ts";
import type { DetectionRule } from "../lib/media-settings.ts";
import { createMediaSignalPipeline as createPipeline } from "../lib/media-signals.ts";
import { readPublicLocationId, readPublicOrchestratorUrl } from "../lib/public-env.ts";

const AUDIO_THROTTLE_MS = 3000;
const VIDEO_THROTTLE_MS = 4000;
const VIDEO_SAMPLE_CADENCE_MS = 1000;
const AUDIO_ACTIVITY_THRESHOLD = 0.2;
const VIDEO_ACTIVITY_THRESHOLD = 0.25;
const AUDIO_ACTIVE_LABEL = "speech";
const AUDIO_IDLE_LABEL = "ambient";
const VIDEO_ACTIVE_LABEL = "motion";
const VIDEO_IDLE_LABEL = "still";
const DEFAULT_RULE_COOLDOWN_MS = 30_000;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal?: boolean;
    0?: { transcript?: string; confidence?: number };
  }>;
};

export type MediaCaptureDetection = {
  label: string;
  score: number;
  source: "audio" | "video";
  updatedAt: number;
  candidates: ReadonlyArray<{ label: string; score: number }>;
};

export type UseMediaCaptureOptions = {
  audioLevelBoost?: number;
  audioActivityThreshold?: number;
  videoActivityThreshold?: number;
  videoSampleCadenceMs?: number;
  learnedVideoSamples?: readonly LearnedVideoSample[];
  learningMatchThreshold?: number;
  locationId?: number;
  orchestratorBaseUrl?: string;
  detectionRules?: readonly DetectionRule[];
  notificationsEnabled?: boolean;
  userId?: number;
};

export type UseMediaCaptureResult = {
  micActive: boolean;
  cameraActive: boolean;
  micLevel: number;
  micError: string | null;
  cameraError: string | null;
  audioDetection: MediaCaptureDetection | null;
  videoDetection: MediaCaptureDetection | null;
  startMic: () => Promise<void>;
  stopMic: () => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureVideoLearningSample: (label: string) => LearnedVideoSample | null;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function useMediaCapture(options: UseMediaCaptureOptions = {}): UseMediaCaptureResult {
  const {
    audioLevelBoost = 8,
    audioActivityThreshold = AUDIO_ACTIVITY_THRESHOLD,
    videoActivityThreshold = VIDEO_ACTIVITY_THRESHOLD,
    videoSampleCadenceMs = VIDEO_SAMPLE_CADENCE_MS,
    learnedVideoSamples = [],
    learningMatchThreshold = 0.65,
    locationId: locationIdOverride,
    orchestratorBaseUrl: orchestratorBaseUrlOverride,
    detectionRules = [],
    notificationsEnabled = false,
    userId = 1,
  } = options;
  const [micActive, setMicActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioDetection, setAudioDetection] = useState<MediaCaptureDetection | null>(null);
  const [videoDetection, setVideoDetection] = useState<MediaCaptureDetection | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micRafRef = useRef<number | null>(null);
  const cameraRafRef = useRef<number | null>(null);
  const lastVideoSampleMsRef = useRef(0);
  const smoothedMicLevelRef = useRef(0);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const signalPipelineRef = useRef<ReturnType<typeof createPipeline> | null>(null);
  const pipelineErrorRef = useRef({ mic: false, camera: false });
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const ruleCooldownsRef = useRef(new Map<string, number>());

  const publicLocationId = readPublicLocationId();
  const publicOrchestratorBaseUrl = readPublicOrchestratorUrl();
  const targetLocationId = locationIdOverride ?? publicLocationId;
  const targetOrchestratorBaseUrl = orchestratorBaseUrlOverride ?? publicOrchestratorBaseUrl;

  const getSignalPipeline = useCallback(() => {
    if (signalPipelineRef.current != null) {
      return signalPipelineRef.current;
    }
    signalPipelineRef.current = createPipeline({
      locationId: targetLocationId,
      audioThrottleMs: AUDIO_THROTTLE_MS,
      videoThrottleMs: VIDEO_THROTTLE_MS,
      emit: async ({ event_type, body }) => {
        await postEvent(targetOrchestratorBaseUrl, {
          location_id: targetLocationId,
          event_type,
          body,
        });
      },
    });
    return signalPipelineRef.current;
  }, [targetLocationId, targetOrchestratorBaseUrl]);

  const maybeNotify = useCallback(
    (match: MediaRuleMatch) => {
      if (!notificationsEnabled || !match.rule.notify) {
        return;
      }
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return;
      }
      const title =
        match.source === "audio"
          ? `Keyword detected: ${match.rule.name}`
          : `Action detected: ${match.rule.name}`;
      const locationTag =
        match.rule.scope === "location" && match.rule.locationId != null
          ? `Location ${match.rule.locationId}`
          : "Global";
      void new Notification(title, {
        body: `${locationTag} • ${match.matchedValue} (${Math.round(match.score * 100)}%)`,
        tag: `ha-detected-${userId}-${match.rule.id}`,
      });
    },
    [notificationsEnabled, userId],
  );

  const shouldEmitRuleMatch = useCallback((match: MediaRuleMatch, nowMs: number): boolean => {
    const cooldownMs = Math.max(0, match.rule.cooldownMs || DEFAULT_RULE_COOLDOWN_MS);
    const key = `${match.rule.id}:${match.matchedValue.toLowerCase()}`;
    const last = ruleCooldownsRef.current.get(key) ?? 0;
    if (nowMs - last < cooldownMs) {
      return false;
    }
    ruleCooldownsRef.current.set(key, nowMs);
    return true;
  }, []);

  const emitRuleMatch = useCallback(
    async (match: MediaRuleMatch) => {
      const nowMs = Date.now();
      if (!shouldEmitRuleMatch(match, nowMs)) {
        return;
      }
      await postEvent(targetOrchestratorBaseUrl, {
        location_id: targetLocationId,
        event_type: MEDIA_DETECTED_EVENT_TYPE,
        body: buildDetectedEventBody({
          source: match.source,
          ruleId: match.rule.id,
          ruleName: match.rule.name,
          ruleKind: match.rule.kind,
          ruleScope: match.rule.scope,
          ruleLocationId: match.rule.locationId,
          matchValue: match.matchedValue,
          matchScore: match.score,
          notify: match.rule.notify,
          candidates: match.candidates,
        }),
      });
      maybeNotify(match);
    },
    [maybeNotify, shouldEmitRuleMatch, targetLocationId, targetOrchestratorBaseUrl],
  );

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
    smoothedMicLevelRef.current = 0;
    setAudioDetection(null);
    if (speechRecognitionRef.current != null) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
  }, []);

  const clearCameraSampling = useCallback(() => {
    if (cameraRafRef.current != null) {
      cancelAnimationFrame(cameraRafRef.current);
      cameraRafRef.current = null;
    }
    lastVideoSampleMsRef.current = 0;
    setVideoDetection(null);
  }, []);

  const ensureFrameCanvas = useCallback((): HTMLCanvasElement => {
    if (frameCanvasRef.current != null) {
      return frameCanvasRef.current;
    }
    frameCanvasRef.current = document.createElement("canvas");
    return frameCanvasRef.current;
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

  const startKeywordRecognition = useCallback(() => {
    const hasKeywordRules = detectionRules.some((rule) => rule.enabled && rule.kind === "keyword");
    if (!hasKeywordRules) {
      return;
    }
    const speechCtor = (
      window as Window & {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }
    ).SpeechRecognition ??
      (
        window as Window & {
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).webkitSpeechRecognition;
    if (speechCtor == null) {
      return;
    }
    const recognition = new speechCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onerror = () => {
      // Swallow engine-level speech errors; mic meter still runs and regular media events still post.
    };
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result?.isFinal === false) {
          continue;
        }
        const transcript = result?.[0]?.transcript?.trim() ?? "";
        if (transcript === "") {
          continue;
        }
        const confidence = result?.[0]?.confidence ?? 0;
        const matches = evaluateKeywordRules({
          rules: detectionRules,
          transcript,
          confidence,
          locationId: targetLocationId,
        });
        for (const match of matches) {
          void emitRuleMatch(match).catch(() => {
            reportPipelineError("mic");
          });
        }
      }
    };
    speechRecognitionRef.current = recognition;
    recognition.start();
  }, [detectionRules, emitRuleMatch, reportPipelineError, targetLocationId]);

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
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Float32Array(analyser.fftSize);
      const byteBuffer = new Uint8Array(analyser.fftSize);
      const frequencyBuffer = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        const a = analyserRef.current;
        if (a == null) return;
        if (typeof a.getFloatTimeDomainData === "function") {
          a.getFloatTimeDomainData(buffer);
        } else {
          a.getByteTimeDomainData(byteBuffer);
          for (let i = 0; i < byteBuffer.length; i++) {
            const value = byteBuffer[i] ?? 128;
            buffer[i] = (value - 128) / 128;
          }
        }
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < buffer.length; i++) {
          const x = buffer[i] ?? 0;
          const abs = Math.abs(x);
          if (abs > peak) {
            peak = abs;
          }
          sum += x * x;
        }
        const rms = Math.sqrt(sum / buffer.length);
        let spectralAverage = 0;
        if (typeof a.getByteFrequencyData === "function") {
          a.getByteFrequencyData(frequencyBuffer);
          let freqSum = 0;
          for (let i = 0; i < frequencyBuffer.length; i++) {
            freqSum += frequencyBuffer[i] ?? 0;
          }
          spectralAverage =
            frequencyBuffer.length > 0 ? freqSum / (frequencyBuffer.length * 255) : 0;
        }
        const instantaneous = Math.min(
          1,
          Math.max(rms * audioLevelBoost, peak * 0.9, spectralAverage * 1.8),
        );
        const smoothed = Math.max(instantaneous, smoothedMicLevelRef.current * 0.84);
        smoothedMicLevelRef.current = smoothed;
        setMicLevel(smoothed);
        const score = smoothed >= audioActivityThreshold ? smoothed : 0;
        const label = score > 0 ? AUDIO_ACTIVE_LABEL : AUDIO_IDLE_LABEL;
        setAudioDetection({
          label,
          score,
          source: "audio",
          updatedAt: Date.now(),
          candidates: [{ label, score }],
        });
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
      startKeywordRecognition();
      setMicActive(true);
    } catch (e) {
      setMicError(formatMediaError("mic", e));
      clearMicAnalysis();
      setMicActive(false);
    }
  }, [
    stopMicTracks,
    clearMicAnalysis,
    getSignalPipeline,
    reportPipelineError,
    audioLevelBoost,
    audioActivityThreshold,
    startKeywordRecognition,
  ]);

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
        if (now - lastVideoSampleMsRef.current >= videoSampleCadenceMs) {
          lastVideoSampleMsRef.current = now;
          const videoEl = videoRef.current;
          const hasVideoData = (videoEl?.videoWidth ?? 0) > 0 && (videoEl?.videoHeight ?? 0) > 0;
          let score = hasVideoData ? 0.9 : 0;
          let label = hasVideoData ? VIDEO_ACTIVE_LABEL : VIDEO_IDLE_LABEL;
          const candidates: Array<{ label: string; score: number }> = [{ label, score }];
          if (videoEl != null && hasVideoData) {
            const feature = createVideoFrameFeature(videoEl, ensureFrameCanvas());
            if (feature != null) {
              const learningMatch = matchLearnedVideoLabel(feature, learnedVideoSamples);
              if (
                learningMatch != null &&
                learningMatch.score >= learningMatchThreshold &&
                learningMatch.score >= score
              ) {
                label = learningMatch.label;
                score = learningMatch.score;
              }
              if (learningMatch != null && learningMatch.score >= learningMatchThreshold) {
                candidates.push({
                  label: learningMatch.label,
                  score: learningMatch.score,
                });
              }
            }
          }
          const actionCandidates: MediaCandidate[] = candidates.map((candidate) => ({
            label: candidate.label,
            score: candidate.score,
          }));
          const actionMatches = evaluateActionRules({
            rules: detectionRules,
            candidates: actionCandidates,
            locationId: targetLocationId,
          });
          for (const match of actionMatches) {
            void emitRuleMatch(match).catch(() => {
              reportPipelineError("camera");
            });
          }
          setVideoDetection({
            label,
            score,
            source: "video",
            updatedAt: now,
            candidates,
          });
          const acceptedScore = score >= videoActivityThreshold ? score : 0;
          const acceptedLabel = acceptedScore > 0 ? label : VIDEO_IDLE_LABEL;
          void getSignalPipeline()
            .handleVideoClassification({
              candidates: [{ label: acceptedLabel, score: acceptedScore }],
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
  }, [
    stopCameraTracks,
    getSignalPipeline,
    reportPipelineError,
    detectionRules,
    emitRuleMatch,
    targetLocationId,
    videoSampleCadenceMs,
    learnedVideoSamples,
    learningMatchThreshold,
    videoActivityThreshold,
    ensureFrameCanvas,
  ]);

  const stopCamera = useCallback(() => {
    setCameraError(null);
    stopCameraTracks();
  }, [stopCameraTracks]);

  const captureVideoLearningSample = useCallback(
    (label: string): LearnedVideoSample | null => {
      const videoEl = videoRef.current;
      if (videoEl == null) {
        return null;
      }
      const feature = createVideoFrameFeature(videoEl, ensureFrameCanvas());
      if (feature == null) {
        return null;
      }
      return createLearnedVideoSample(label, feature);
    },
    [ensureFrameCanvas],
  );

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
      if (speechRecognitionRef.current != null) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
      ruleCooldownsRef.current.clear();
    };
  }, []);

  return {
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
    captureVideoLearningSample,
    videoRef,
  };
}
