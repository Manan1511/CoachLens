import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/http';
import { extractKeypointFrame } from './extractKeypointFrame';
import type { PoseFrame } from './usePoseLandmarker';
import type { BowlingArm, CoachingReport, KeypointFrame } from '@/lib/api/types';

/** CAPTURE_PLAN.md Milestone 3: buffers live frames into one delivery and
 *  submits it. The capture window is 1.5s - not a new number, the same one
 *  Milestone 0.5's fps/budget math was already computed against
 *  (CAPTURE_PLAN.md: "120fps x 1.5s = 180 frames"), so the coach's actual
 *  tap-to-verdict latency matches what was already measured and documented
 *  rather than introducing an undocumented window this math doesn't cover. */
const CAPTURE_WINDOW_MS = 1500;

export type DeliveryCaptureState =
  | { status: 'idle' }
  | { status: 'recording'; framesCaptured: number }
  | { status: 'submitting' }
  | { status: 'error'; message: string }
  | { status: 'done'; report: CoachingReport };

interface UseDeliveryCaptureArgs {
  sessionId: string;
  bowlingArm: BowlingArm | null;
  frame: PoseFrame | null;
  videoSize: { width: number; height: number } | null;
  /** Live roll reading from useDeviceOrientation, when available - real
   *  sensor data, not fabricated, so worth sending when there is one. */
  cameraRollDeg: number | null;
}

function generateDeliveryId(): string {
  // Any unique string works server-side (repository.save_delivery upserts
  // on this as the row id) - "DEL-" only matters for matching the PRD
  // example's style and services/coaching-api's own "RPT-{delivery_id}"
  // report-id convention, not because anything parses the prefix.
  return `DEL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useDeliveryCapture({
  sessionId,
  bowlingArm,
  frame,
  videoSize,
  cameraRollDeg,
}: UseDeliveryCaptureArgs) {
  const [state, setState] = useState<DeliveryCaptureState>({ status: 'idle' });
  const buffer = useRef<KeypointFrame[]>([]);
  const frameTimestamps = useRef<number[]>([]);
  const startTime = useRef(0);
  // Guards against submitting twice if more than one frame arrives before
  // the 'submitting' state commits and this effect sees it on rerun.
  const submittingRef = useRef(false);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  const start = useCallback(() => {
    buffer.current = [];
    frameTimestamps.current = [];
    startTime.current = performance.now();
    submittingRef.current = false;
    setState({ status: 'recording', framesCaptured: 0 });
  }, []);

  useEffect(() => {
    if (state.status !== 'recording' || submittingRef.current) return;
    if (!frame || !videoSize || !bowlingArm) return;

    const elapsedMs = performance.now() - startTime.current;

    if (elapsedMs >= CAPTURE_WINDOW_MS) {
      submittingRef.current = true;
      setState({ status: 'submitting' });

      const kfs = buffer.current;
      const ts = frameTimestamps.current;
      const deltas = ts.slice(1).map((t, i) => t - ts[i]);
      const meanDelta = deltas.reduce((a, b) => a + b, 0) / (deltas.length || 1);
      const fps = meanDelta > 0 ? 1000 / meanDelta : 0;
      const variance = deltas.reduce((a, d) => a + (d - meanDelta) ** 2, 0) / (deltas.length || 1);
      const jitterPct = meanDelta > 0 ? (Math.sqrt(variance) / meanDelta) * 100 : 0;

      const payload = {
        delivery_id: generateDeliveryId(),
        session_id: sessionId,
        capture_metadata: {
          fps: Math.round(fps),
          pacing_jitter_pct: Math.round(jitterPct * 10) / 10,
          shutter_speed_sec: null, // unknown on this platform - see usePoseLandmarker's own note
          // Guided targets, not sensor-measured - CAPTURE_PLAN.md §2: no
          // browser API gives real distance/height. Midpoint of the PRD's
          // 2.8-3.2m guided range; 1.1m is the PRD's fixed tripod height.
          distance_meters: 3.0,
          tripod_height_meters: 1.1,
          camera_roll_deg: cameraRollDeg ?? 0,
        },
        raw_keypoints: kfs,
      };

      api
        .submitDelivery(payload)
        .then((report) => setState({ status: 'done', report }))
        .catch((err) => {
          const message =
            err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
          setState({ status: 'error', message });
        });
      return;
    }

    const kf = extractKeypointFrame(
      frame.landmarks,
      buffer.current.length,
      elapsedMs,
      videoSize.width,
      videoSize.height,
      bowlingArm,
    );
    if (kf) {
      buffer.current.push(kf);
      frameTimestamps.current.push(elapsedMs);
    }
    setState({ status: 'recording', framesCaptured: buffer.current.length });
    // Deliberately only `frame` - this must re-run on every new detection
    // result while recording, not on sessionId/bowlingArm/videoSize
    // changing mid-capture (those are stable for the ~1.5s window a
    // recording actually runs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  return { state, start, reset };
}
