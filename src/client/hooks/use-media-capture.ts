import type { RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatMediaError, formatTrackEndedMessage } from "../lib/media-errors.ts";

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
  const rafRef = useRef<number | null>(null);

  const clearMicAnalysis = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    const ctx = audioContextRef.current;
    audioContextRef.current = null;
    if (ctx != null && ctx.state !== "closed") {
      void ctx.close();
    }
    setMicLevel(0);
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
    const v = videoRef.current;
    if (v != null) v.srcObject = null;
    if (s != null) {
      for (const t of s.getTracks()) t.stop();
    }
    setCameraActive(false);
  }, []);

  const startMic = useCallback(async () => {
    setMicError(null);
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
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      setMicActive(true);
    } catch (e) {
      setMicError(formatMediaError("mic", e));
      clearMicAnalysis();
      setMicActive(false);
    }
  }, [stopMicTracks, clearMicAnalysis]);

  const stopMic = useCallback(() => {
    setMicError(null);
    stopMicTracks();
  }, [stopMicTracks]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
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
    } catch (e) {
      setCameraError(formatMediaError("camera", e));
      setCameraActive(false);
    }
  }, [stopCameraTracks]);

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
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
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
