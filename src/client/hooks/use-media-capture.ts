import type { RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { postEvent } from "../api/events-client.ts";
import {
  MEDIA_TRANSCRIPT_EVENT_TYPE,
  buildTranscriptEventBody,
  MEDIA_VISION_EVENT_TYPE,
  buildVisionEventBody,
} from "../lib/media-event-types.ts";
import {
  createLearnedVideoSample,
  createVideoFrameFeature,
  matchLearnedVideoLabel,
  type LearnedVideoSample,
} from "../lib/media-learning.ts";
import { formatMediaError, formatTrackEndedMessage } from "../lib/media-errors.ts";
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
const DEFAULT_RECOGNITION_LANGUAGE = "en-US";
const TRANSCRIPT_RECENCY_MS = 15_000;
const TRANSCRIPT_PAUSE_BUFFER_MS = 900;
const VISION_BUFFER_MS = 2000;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
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
  recognitionLanguage?: string;
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
    recognitionLanguage,
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
  const shouldRunRecognitionRef = useRef(false);
  const recognitionRestartTimeoutRef = useRef<number | null>(null);
  const latestTranscriptRef = useRef<{
    transcript: string;
    confidence: number;
    recognitionLanguage: string;
    capturedAt: number;
  } | null>(null);
  const transcriptBufferRef = useRef<{
    transcript: string;
    confidence: number;
    recognitionLanguage: string;
    isFinal: boolean;
  } | null>(null);
  const transcriptFlushTimeoutRef = useRef<number | null>(null);
  const lastSentTranscriptRef = useRef<{
    transcript: string;
    isFinal: boolean;
    sentAt: number;
  } | null>(null);
  const visionBufferRef = useRef<{
    label: string;
    score: number;
    candidates: Array<{ label: string; score: number }>;
  } | null>(null);
  const visionFlushTimeoutRef = useRef<number | null>(null);

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
    latestTranscriptRef.current = null;
    shouldRunRecognitionRef.current = false;
    transcriptBufferRef.current = null;
    if (transcriptFlushTimeoutRef.current != null) {
      window.clearTimeout(transcriptFlushTimeoutRef.current);
      transcriptFlushTimeoutRef.current = null;
    }
    if (recognitionRestartTimeoutRef.current != null) {
      window.clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }
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
    visionBufferRef.current = null;
    if (visionFlushTimeoutRef.current != null) {
      window.clearTimeout(visionFlushTimeoutRef.current);
      visionFlushTimeoutRef.current = null;
    }
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

  const flushTranscriptBuffer = useCallback(() => {
    if (transcriptFlushTimeoutRef.current != null) {
      window.clearTimeout(transcriptFlushTimeoutRef.current);
      transcriptFlushTimeoutRef.current = null;
    }
    const buffered = transcriptBufferRef.current;
    transcriptBufferRef.current = null;
    if (buffered == null) {
      return;
    }
    const transcript = buffered.transcript.trim().replace(/\s+/g, " ");
    if (transcript === "") {
      return;
    }
    const lastSent = lastSentTranscriptRef.current;
    if (
      lastSent != null &&
      lastSent.transcript === transcript &&
      lastSent.isFinal === buffered.isFinal &&
      Date.now() - lastSent.sentAt < 10_000
    ) {
      return;
    }
    lastSentTranscriptRef.current = {
      transcript,
      isFinal: buffered.isFinal,
      sentAt: Date.now(),
    };
    void postEvent(targetOrchestratorBaseUrl, {
      location_id: targetLocationId,
      event_type: MEDIA_TRANSCRIPT_EVENT_TYPE,
      body: buildTranscriptEventBody({
        transcript,
        confidence: buffered.confidence,
        recognitionLanguage: buffered.recognitionLanguage,
        isFinal: buffered.isFinal,
      }),
    }).catch(() => {
      reportPipelineError("mic");
    });
  }, [reportPipelineError, targetLocationId, targetOrchestratorBaseUrl]);

  const queueTranscriptEvent = useCallback(
    (payload: { transcript: string; confidence: number; recognitionLanguage: string; isFinal: boolean }) => {
      const normalizedTranscript = payload.transcript.trim().replace(/\s+/g, " ");
      if (normalizedTranscript === "") {
        return;
      }
      if (payload.isFinal) {
        transcriptBufferRef.current = {
          transcript: normalizedTranscript,
          confidence: payload.confidence,
          recognitionLanguage: payload.recognitionLanguage,
          isFinal: true,
        };
        flushTranscriptBuffer();
        return;
      }
      const current = transcriptBufferRef.current;
      // Keep the most informative interim hypothesis instead of concatenating partials.
      if (
        current == null ||
        current.isFinal ||
        normalizedTranscript.length >= current.transcript.length
      ) {
        transcriptBufferRef.current = {
          transcript: normalizedTranscript,
          confidence: payload.confidence,
          recognitionLanguage: payload.recognitionLanguage,
          isFinal: false,
        };
      }
      if (transcriptFlushTimeoutRef.current != null) {
        window.clearTimeout(transcriptFlushTimeoutRef.current);
      }
      transcriptFlushTimeoutRef.current = window.setTimeout(() => {
        flushTranscriptBuffer();
      }, TRANSCRIPT_PAUSE_BUFFER_MS);
    },
    [flushTranscriptBuffer],
  );

  const flushVisionBuffer = useCallback(() => {
    if (visionFlushTimeoutRef.current != null) {
      window.clearTimeout(visionFlushTimeoutRef.current);
      visionFlushTimeoutRef.current = null;
    }
    const buffered = visionBufferRef.current;
    visionBufferRef.current = null;
    if (buffered == null) {
      return;
    }
    void postEvent(targetOrchestratorBaseUrl, {
      location_id: targetLocationId,
      event_type: MEDIA_VISION_EVENT_TYPE,
      body: buildVisionEventBody(buffered.label, buffered.score, buffered.candidates),
    }).catch(() => {
      reportPipelineError("camera");
    });
  }, [reportPipelineError, targetLocationId, targetOrchestratorBaseUrl]);

  const queueVisionEvent = useCallback(
    (payload: { label: string; score: number; candidates: Array<{ label: string; score: number }> }) => {
      visionBufferRef.current = payload;
      if (visionFlushTimeoutRef.current != null) {
        return;
      }
      visionFlushTimeoutRef.current = window.setTimeout(() => {
        flushVisionBuffer();
      }, VISION_BUFFER_MS);
    },
    [flushVisionBuffer],
  );

  const startKeywordRecognition = useCallback(() => {
    if (!shouldRunRecognitionRef.current) {
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
    const resolvedLanguage =
      recognitionLanguage?.trim() ||
      (typeof navigator !== "undefined" && typeof navigator.language === "string"
        ? navigator.language.trim()
        : "") ||
      DEFAULT_RECOGNITION_LANGUAGE;
    recognition.lang = resolvedLanguage;
    recognition.onerror = () => {
      // Swallow engine-level speech errors; mic meter still runs and regular media events still post.
    };
    recognition.onend = () => {
      speechRecognitionRef.current = null;
      if (!shouldRunRecognitionRef.current || micStreamRef.current == null) {
        return;
      }
      if (recognitionRestartTimeoutRef.current != null) {
        return;
      }
      recognitionRestartTimeoutRef.current = window.setTimeout(() => {
        recognitionRestartTimeoutRef.current = null;
        startKeywordRecognition();
      }, 400);
    };
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript?.trim() ?? "";
        if (transcript === "") {
          continue;
        }
        const rawConfidence = result?.[0]?.confidence;
        const confidence =
          typeof rawConfidence === "number" && Number.isFinite(rawConfidence) && rawConfidence > 0
            ? rawConfidence
            : 1;
        latestTranscriptRef.current = {
          transcript,
          confidence,
          recognitionLanguage: resolvedLanguage,
          capturedAt: Date.now(),
        };
        queueTranscriptEvent({
          transcript,
          confidence,
          recognitionLanguage: resolvedLanguage,
          isFinal: result?.isFinal !== false,
        });
        if (result?.isFinal === false) {
          continue;
        }
      }
    };
    speechRecognitionRef.current = recognition;
    recognition.start();
  }, [queueTranscriptEvent, recognitionLanguage]);

  const stopMicTracks = useCallback(() => {
    const s = micStreamRef.current;
    micStreamRef.current = null;
    if (s != null && typeof s.getTracks === "function") {
      for (const t of s.getTracks()) t.stop();
    }
    flushTranscriptBuffer();
    clearMicAnalysis();
    setMicActive(false);
  }, [clearMicAnalysis, flushTranscriptBuffer]);

  const stopCameraTracks = useCallback(() => {
    const s = cameraStreamRef.current;
    cameraStreamRef.current = null;
    flushVisionBuffer();
    clearCameraSampling();
    const v = videoRef.current;
    if (v != null) v.srcObject = null;
    if (s != null && typeof s.getTracks === "function") {
      for (const t of s.getTracks()) t.stop();
    }
    setCameraActive(false);
  }, [clearCameraSampling, flushVisionBuffer]);

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
        const latestTranscript = latestTranscriptRef.current;
        const transcriptIsFresh =
          latestTranscript != null && Date.now() - latestTranscript.capturedAt <= TRANSCRIPT_RECENCY_MS;
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
            transcript: transcriptIsFresh ? latestTranscript?.transcript : undefined,
            recognitionLanguage: transcriptIsFresh ? latestTranscript?.recognitionLanguage : undefined,
            transcriptConfidence: transcriptIsFresh ? latestTranscript?.confidence : undefined,
          })
          .catch(() => {
            reportPipelineError("mic");
          });
        micRafRef.current = requestAnimationFrame(tick);
      };
      micRafRef.current = requestAnimationFrame(tick);
      shouldRunRecognitionRef.current = true;
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
          setVideoDetection({
            label,
            score,
            source: "video",
            updatedAt: now,
            candidates,
          });
          queueVisionEvent({
            label,
            score,
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
    queueVisionEvent,
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
      shouldRunRecognitionRef.current = false;
      if (speechRecognitionRef.current != null) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
      if (recognitionRestartTimeoutRef.current != null) {
        window.clearTimeout(recognitionRestartTimeoutRef.current);
        recognitionRestartTimeoutRef.current = null;
      }
      if (transcriptFlushTimeoutRef.current != null) {
        window.clearTimeout(transcriptFlushTimeoutRef.current);
        transcriptFlushTimeoutRef.current = null;
      }
      if (visionFlushTimeoutRef.current != null) {
        window.clearTimeout(visionFlushTimeoutRef.current);
        visionFlushTimeoutRef.current = null;
      }
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
