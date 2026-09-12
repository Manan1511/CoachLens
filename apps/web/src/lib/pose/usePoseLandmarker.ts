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

/** Ordered best-first. Walked top to bottom until one actually starts.
 *
 *  `ideal` looks like it should make this unnecessary - by spec it's a
 *  preference, not a requirement - but it isn't a safety net on Windows.
 *  Chromium accepts the format during negotiation, then fails when it tries
 *  to actually start the capture graph, and surfaces that as
 *  `NotReadableError: Could not start video source` rather than
 *  `OverconstrainedError`. The message reads like "another app has your
 *  webcam", so it sends you hunting for a phantom process holding the device
 *  (it cost a long detour through Windows privacy settings and Device
 *  Manager before the real cause turned up).
 *
 *  Confirmed on an HP True Vision FHD laptop webcam, which advertises FHD
 *  but cold-starts only at 640x480: every 1080p request failed, plain
 *  `{ video: true }` succeeded immediately. A phone's rear camera takes the
 *  first rung, so nothing is lost where the resolution actually matters. */
const CONSTRAINT_LADDER: MediaStreamConstraints[] = [
  { video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
  { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
  { video: { facingMode: 'environment' }, audio: false },
  { video: true, audio: false },
];

/** Errors that mean "no camera for you, ever" - retrying or relaxing
 *  constraints just delays an honest message to the coach. Anything else is
 *  worth trying the next rung for. */
const TERMINAL_ERRORS = new Set(['NotAllowedError', 'SecurityError', 'NotFoundError']);

/** How long to keep the camera open after the last consumer goes away.
 *  Only needs to outlast React's synchronous unmount/remount gap. */
const CAMERA_RELEASE_DELAY_MS = 400;

/** The camera is a single exclusive device, so it's owned here at module
 *  scope and shared across mounts rather than acquired per-mount. Two real
 *  failures on real hardware forced this, both of which present as
 *  `NotReadableError: Could not start video source` - a message that reads
 *  like "another app has your webcam" and in neither case was:
 *
 *  1. React StrictMode mounts, unmounts and remounts every effect in dev.
 *     Per-mount acquire/release raced itself: cleanup ran while the first
 *     getUserMedia was still in flight (so it had no stream to stop yet), the
 *     remount opened a second one concurrently, and the first then stopped
 *     its tracks - tearing the shared device session down under the second.
 *  2. Serialising the two fixed the ordering but not the symptom, because
 *     `track.stop()` returns to JS long before the browser process has
 *     actually closed the device underneath. Reopening in the next tick -
 *     which is exactly what a StrictMode remount does - still fails.
 *
 *  Hence: acquire once, hand the same stream to every mount, and release on
 *  a short timer so a remount inside that window reuses the live stream
 *  instead of churning the device at all. */
let sharedStream: MediaStream | null = null;
let pendingAcquire: Promise<MediaStream> | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

function acquireCamera(): Promise<MediaStream> {
  if (releaseTimer !== null) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  if (sharedStream?.getVideoTracks().some((t) => t.readyState === 'live')) {
    return Promise.resolve(sharedStream);
  }
  pendingAcquire ??= openWithRetry()
    .then((s) => {
      sharedStream = s;
      return s;
    })
    .catch((err) => {
      pendingAcquire = null; // let the next mount retry rather than latching the failure
      throw err;
    });
  return pendingAcquire;
}

/** Walks CONSTRAINT_LADDER and keeps the first source that actually starts.
 *  Each rung is a genuine cold open: a device that refuses one format can
 *  still be perfectly happy on the next one down. */
async function openWithRetry(): Promise<MediaStream> {
  let lastErr: unknown;

  for (const [rung, constraints] of CONSTRAINT_LADDER.entries()) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastErr = err;
      const name = (err as DOMException)?.name;
      if (TERMINAL_ERRORS.has(name)) throw err;
      console.warn('[camera] ladder rung %d failed (%s) — trying a simpler source', rung, name);
      // A failed start can leave the device briefly busy; let it settle
      // before asking again, or the next rung inherits the same failure.
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  throw lastErr;
}

function releaseCamera() {
  if (releaseTimer !== null) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    sharedStream?.getTracks().forEach((t) => t.stop());
    sharedStream = null;
    pendingAcquire = null;
  }, CAMERA_RELEASE_DELAY_MS);
}

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
    let landmarker: PoseLandmarker | null = null;

    (async () => {
      let stream: MediaStream;
      try {
        stream = await acquireCamera();
      } catch (err) {
        if (!cancelled) setCameraError(err instanceof Error ? err.message : String(err));
        return;
      }
      if (cancelled) return;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      // play() rejects if the element is torn down mid-call; that's a
      // teardown, not a camera failure, so it must not surface as one.
      try {
        await video.play();
      } catch {
        if (cancelled) return;
      }
      const settings = stream.getVideoTracks()[0].getSettings();
      if (!cancelled) setVideoSize({ width: settings.width ?? 0, height: settings.height ?? 0 });

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        landmarker = await PoseLandmarker.createFromOptions(vision, {
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
        if (!cancelled) setModelError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      setReady(false);
      landmarkerRef.current = null;
      landmarker?.close();
      releaseCamera();
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
