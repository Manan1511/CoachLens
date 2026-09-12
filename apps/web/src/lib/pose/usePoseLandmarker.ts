import { useEffect, useRef, useState } from 'react';
import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

/** Wraps MediaPipe Tasks Vision's PoseLandmarker for a live `getUserMedia`
 *  stream. See CAPTURE_PLAN.md Milestone 0.5 for why this exists as a
 *  browser/WASM pipeline instead of the native app that was built and then
 *  deleted earlier the same day — on-device extraction doesn't require a
 *  compiled app, just a secure context (see the videoRef/error notes below).
 *
 *  The WASM runtime loads from jsdelivr's CDN, pinned to the exact installed
 *  package version — not bundled, since it's 34MB across three build
 *  variants and is itself versioned/cacheable. The model file *is* bundled
 *  locally (public/models/) per that same milestone's decision.
 */

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_PATH = '/models/pose_landmarker_lite.task';

// Same 33-point BlazePose index used by the deleted native spike -
// MediaPipe's landmark ordering is identical across native and web.
export const POSE_LANDMARK = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftWrist: 15,
  rightWrist: 16,
} as const;

export interface PoseFrame {
  landmarks: NormalizedLandmark[];
  inferenceMs: number;
}

interface UsePoseLandmarkerResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoSize: { width: number; height: number } | null;
  frame: PoseFrame | null;
  cameraError: string | null;
  modelError: string | null;
  /** True once getUserMedia + the PoseLandmarker are both ready and the
   *  detection loop is running - distinct from "a pose was found in the
   *  latest frame" (frame can be non-null with an empty landmarks array). */
  ready: boolean;
}

/** `active`: whether to hold the camera open and run detection at all. Pass
 *  false when the pool-setup screen is showing so the camera isn't lit and
 *  inference isn't burning battery/CPU behind a screen the coach isn't
 *  looking at - matches the "capture screen only" scope from the deleted
 *  native plan's own reasoning, just re-applied here. */
export function usePoseLandmarker(active: boolean): UsePoseLandmarkerResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);

  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(null);
  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function setup() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const settings = stream.getVideoTracks()[0].getSettings();
        setVideoSize({ width: settings.width ?? 0, height: settings.height ?? 0 });
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : String(err));
        return;
      }

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setReady(true);
      } catch (err) {
        setModelError(err instanceof Error ? err.message : String(err));
      }
    }

    setup();

    return () => {
      cancelled = true;
      setReady(false);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    function loop() {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (video && landmarker && video.readyState >= 2) {
        const start = performance.now();
        const result = landmarker.detectForVideo(video, start);
        const inferenceMs = performance.now() - start;
        setFrame({ landmarks: result.landmarks[0] ?? [], inferenceMs });
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return { videoRef, videoSize, frame, cameraError, modelError, ready };
}
