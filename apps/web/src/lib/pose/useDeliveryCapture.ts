import { useCallback, useEffect, useRef, useState } from 'react';
import { extractKeypointFrame } from './extractKeypointFrame';
import { submitDeliverySliceSafe } from './submitDeliverySlice';
import type { PoseFrame } from './usePoseLandmarker';
import type { BowlingArm, CoachingReport, KeypointFrame } from '@/lib/api/types';

/** CAPTURE_PLAN.md Milestone 3: buffers live frames into one delivery and
 *  submits it. The capture window is 1.5s - not a new number, the same one
 *  Milestone 0.5's fps/budget math was already computed against
 *  (CAPTURE_PLAN.md: "120fps x 1.5s = 180 frames"), so the coach's actual
 *  tap-to-verdict latency matches what was already measured and documented
 *  rather than introducing an undocumented window this math doesn't cover.
 *
 *  Refactored to use submitDeliverySlice for the actual submission, so the
 *  fps/jitter/payload logic is shared with useSpellCapture. This hook is
 *  now the "manual fallback" path — tap once to record 1.5s, submit. */
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

      submitDeliverySliceSafe({
        frames: buffer.current,
        timestamps: frameTimestamps.current,
        sessionId,
        cameraRollDeg: cameraRollDeg ?? 0,
      }).then((result) => {
        if (result.ok) {
          setState({ status: 'done', report: result.report });
        } else {
          setState({ status: 'error', message: result.message });
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  return { state, start, reset };
}
