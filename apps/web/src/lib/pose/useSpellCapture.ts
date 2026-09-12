import { useCallback, useEffect, useRef, useState } from 'react';
import { useRingBuffer, feedRingBuffer } from './useRingBuffer';
import { useCreaseTrigger, COOLDOWN_MS } from './useCreaseTrigger';
import { submitDeliverySliceSafe } from './submitDeliverySlice';
import type { PoseFrame } from './usePoseLandmarker';
import type { BowlingArm, CoachingReport } from '@/lib/api/types';

/** How much time before the trigger point to include in the delivery
 *  slice (captures the run-up stride leading to FFS). */
const PRE_TRIGGER_MS = 1000;

/** How much time after the trigger point to continue buffering before
 *  slicing and submitting (captures the ball release phase). */
const POST_TRIGGER_MS = 500;

/** Audio chime frequency (Hz) — A5, a clean, audible tone. */
const CHIME_FREQ_HZ = 880;

/** Audio chime duration (ms). */
const CHIME_DURATION_MS = 200;

/** Audio chime gain (0–1). Low enough not to startle, high enough to
 *  be heard from 20m across a cricket net. */
const CHIME_GAIN = 0.15;

/** Toast display duration (ms). */
export const TOAST_DURATION_MS = 3000;

// --- Types ---

export interface CapturedDelivery {
  deliveryId: string;
  status: string;
  kneeAngleDeg: number | null;
  trunkTiltDeg: number | null;
  timestamp: number;
  report: CoachingReport;
}

export type SpellState =
  | { status: 'idle' }
  | { status: 'watching'; deliveriesCaptured: number }
  | { status: 'post-trigger'; triggerTimestamp: number; deliveriesCaptured: number }
  | { status: 'submitting'; deliveriesCaptured: number }
  | {
      status: 'cooldown';
      deliveriesCaptured: number;
      cooldownEndsAt: number;
    };

export interface SpellToast {
  id: string;
  deliveryNumber: number;
  status: string;
  message: string;
  isError: boolean;
  expiresAt: number;
}

interface UseSpellCaptureArgs {
  sessionId: string;
  bowlingArm: BowlingArm | null;
  frame: PoseFrame | null;
  videoSize: { width: number; height: number } | null;
  cameraRollDeg: number | null;
}

// --- Audio chime (module-scoped, created once) ---

let audioCtx: AudioContext | null = null;

function playChime(): void {
  try {
    audioCtx ??= new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = CHIME_FREQ_HZ;
    gain.gain.value = CHIME_GAIN;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + CHIME_DURATION_MS / 1000);
  } catch {
    // AudioContext can fail on some browsers/policies — non-critical.
  }
}

// --- Hook ---

export function useSpellCapture({
  sessionId,
  bowlingArm,
  frame,
  videoSize,
  cameraRollDeg,
}: UseSpellCaptureArgs) {
  const [state, setState] = useState<SpellState>({ status: 'idle' });
  const [toasts, setToasts] = useState<SpellToast[]>([]);
  const [deliveryLog, setDeliveryLog] = useState<CapturedDelivery[]>([]);

  const ringBuffer = useRingBuffer();
  const trigger = useCreaseTrigger();

  const frameIndexRef = useRef(0);
  const spellStartTimeRef = useRef(0);
  const postTriggerTimestampRef = useRef(0);

  // --- Spell lifecycle ---

  const startSpell = useCallback(() => {
    ringBuffer.clear();
    trigger.reset();
    frameIndexRef.current = 0;
    spellStartTimeRef.current = performance.now();
    setDeliveryLog([]);
    setToasts([]);
    setState({ status: 'watching', deliveriesCaptured: 0 });
  }, [ringBuffer, trigger]);

  const endSpell = useCallback(() => {
    ringBuffer.clear();
    trigger.reset();
    setState({ status: 'idle' });
  }, [ringBuffer, trigger]);

  // --- Toast management ---

  const addToast = useCallback(
    (deliveryNumber: number, status: string, message: string, isError: boolean) => {
      const toast: SpellToast = {
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        deliveryNumber,
        status,
        message,
        isError,
        expiresAt: Date.now() + TOAST_DURATION_MS,
      };
      setToasts((prev) => [...prev, toast]);
      // Auto-remove after TOAST_DURATION_MS
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, TOAST_DURATION_MS);
    },
    [],
  );

  // --- Frame processing effect ---

  useEffect(() => {
    if (state.status === 'idle') return;
    if (!frame || !videoSize || !bowlingArm) return;

    const now = performance.now();
    const elapsedMs = now - spellStartTimeRef.current;

    // Always feed the ring buffer while spell is active (any non-idle state).
    feedRingBuffer(
      ringBuffer,
      frame,
      frameIndexRef.current++,
      elapsedMs,
      videoSize.width,
      videoSize.height,
      bowlingArm,
    );

    // State-specific logic
    if (state.status === 'watching') {
      // Check for trigger
      const triggerTs = trigger.check(ringBuffer, videoSize.width, videoSize.height);
      if (triggerTs !== null) {
        postTriggerTimestampRef.current = now;
        setState((prev) => ({
          status: 'post-trigger' as const,
          triggerTimestamp: triggerTs,
          deliveriesCaptured: prev.status !== 'idle' ? (prev as { deliveriesCaptured: number }).deliveriesCaptured : 0,
        }));
      }
    } else if (state.status === 'post-trigger') {
      // Continue buffering for POST_TRIGGER_MS after the trigger
      const sinceTriger = now - postTriggerTimestampRef.current;
      if (sinceTriger >= POST_TRIGGER_MS) {
        // Slice and submit
        const sliceFrom = state.triggerTimestamp - PRE_TRIGGER_MS;
        const sliceTo = elapsedMs;
        const slicedEntries = ringBuffer.slice(sliceFrom, sliceTo);
        const frames = slicedEntries.map((e) => e.kf);
        const timestamps = slicedEntries.map((e) => e.timestamp);

        if (frames.length < 3) {
          // Not enough frames — skip silently, go back to watching
          setState((prev) => ({
            status: 'watching' as const,
            deliveriesCaptured: (prev as { deliveriesCaptured: number }).deliveriesCaptured,
          }));
          return;
        }

        const currentCount = state.deliveriesCaptured;
        setState({ status: 'submitting', deliveriesCaptured: currentCount });

        submitDeliverySliceSafe({
          frames,
          timestamps,
          sessionId,
          cameraRollDeg: cameraRollDeg ?? 0,
        }).then((result) => {
          const newCount = currentCount + 1;
          trigger.startCooldown();

          if (result.ok) {
            playChime();
            const report = result.report;
            const delivery: CapturedDelivery = {
              deliveryId: report.delivery_id,
              status: report.verdict.status,
              kneeAngleDeg: report.kinematics?.front_knee_angle_deg ?? null,
              trunkTiltDeg: report.kinematics?.forward_trunk_tilt_deg ?? null,
              timestamp: Date.now(),
              report,
            };
            setDeliveryLog((prev) => [...prev, delivery]);
            addToast(newCount, report.verdict.status, `Delivery #${newCount}`, false);
          } else {
            addToast(newCount, 'ERROR', result.message, true);
          }

          setState({
            status: 'cooldown',
            deliveriesCaptured: newCount,
            cooldownEndsAt: performance.now() + COOLDOWN_MS,
          });
        });
      }
    } else if (state.status === 'cooldown') {
      if (now >= state.cooldownEndsAt) {
        setState({ status: 'watching', deliveriesCaptured: state.deliveriesCaptured });
      }
    }
    // 'submitting' — nothing to do, wait for the promise to resolve.

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  return {
    state,
    toasts,
    deliveryLog,
    startSpell,
    endSpell,
    ringBuffer,
  };
}
