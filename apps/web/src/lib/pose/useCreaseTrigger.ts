import { useCallback, useRef } from 'react';
import type { RingBufferHandle } from './useRingBuffer';

/** Client-side three-cue FFS detector for auto-triggering delivery
 *  capture. Uses the same biomechanical signals as the backend's
 *  events.py (PRD §6.1) — ankle vertical velocity near zero, ankle at
 *  lowest point, horizontal deceleration — but as a binary gate ("did a
 *  delivery just happen?") rather than sub-frame precision.
 *
 *  All three cues must co-occur within the same 3-frame window, and the
 *  ankle must have transitioned *into* the crease zone (not been
 *  standing there already) to prevent re-triggering on a stationary
 *  bowler between deliveries. */

// --- Named constants (not magic numbers) ---

/** Left bound of the crease zone in normalized x-coordinates.
 *  The camera is aimed at the popping crease; the central 50% of the
 *  frame is where the delivery stride lands. */
const CREASE_ZONE_X_MIN = 0.25;

/** Right bound of the crease zone. */
const CREASE_ZONE_X_MAX = 0.75;

/** Normalised y-velocity magnitude below which the ankle is considered
 *  "stopped" (ground contact), measured in screen-heights per second. */
const VELOCITY_ZERO_THRESHOLD = 0.35;

/** Minimum negative normalised x-acceleration to count as "braking"
 *  (the bowler was running forward and suddenly stopped), measured in
 *  screen-widths per second squared. */
const DECEL_THRESHOLD = 2.0;

/** Minimum entries needed in the analysis window to compute velocity
 *  and acceleration reliably. */
const MIN_FRAMES_FOR_TRIGGER = 5;

/** Dead time after a trigger before the next one can fire. */
export const COOLDOWN_MS = 5000;

/** Minimum ankle confidence to consider a frame for triggering. Below
 *  this, MediaPipe likely lost the ankle entirely. */
const MIN_ANKLE_CONF = 0.50;

// --- Trigger interface ---

export interface CreaseTriggerHandle {
  /** Call on every frame while spell is active. Returns a trigger
   *  timestamp (performance.now()-based, from the ring buffer entry) if
   *  a delivery was detected, or null if not. */
  check: (ringBuffer: RingBufferHandle, videoWidth: number, videoHeight: number) => number | null;

  /** Notify the trigger that a delivery was processed so the cooldown
   *  timer starts. */
  startCooldown: () => void;

  /** Whether we're currently in cooldown. */
  inCooldown: () => boolean;

  /** Reset (e.g. when spell ends). */
  reset: () => void;
}

export function useCreaseTrigger(): CreaseTriggerHandle {
  const lastTriggerTime = useRef<number>(0);
  const cooldownUntil = useRef<number>(0);

  const inCooldown = useCallback((): boolean => {
    return performance.now() < cooldownUntil.current;
  }, []);

  const startCooldown = useCallback(() => {
    cooldownUntil.current = performance.now() + COOLDOWN_MS;
  }, []);

  const reset = useCallback(() => {
    lastTriggerTime.current = 0;
    cooldownUntil.current = 0;
  }, []);

  const check = useCallback(
    (ringBuffer: RingBufferHandle, videoWidth: number, videoHeight: number): number | null => {
      if (inCooldown()) return null;

      const entries = ringBuffer.recent(MIN_FRAMES_FOR_TRIGGER + 3);
      if (entries.length < MIN_FRAMES_FOR_TRIGGER) return null;

      // Work with the most recent frames for the velocity/acceleration
      // analysis window (last 3–5 frames).
      const window = entries.slice(-MIN_FRAMES_FOR_TRIGGER);
      const latest = window[window.length - 1];

      // Confidence gate: if the ankle landmark is poorly tracked, skip.
      if (latest.kf.ankle.conf < MIN_ANKLE_CONF) return null;

      // Normalise ankle positions to [0,1] for resolution-independent
      // thresholds. The ring buffer stores pixel-space coords (per
      // extractKeypointFrame), so divide back.
      const normX = latest.kf.ankle.x / videoWidth;

      // Cue 1: Ankle must be inside the crease zone.
      if (normX < CREASE_ZONE_X_MIN || normX > CREASE_ZONE_X_MAX) return null;

      // Entry transition check: the ankle must have been *outside* the
      // crease zone in prior frames before this plant window. This prevents
      // re-triggering on a bowler standing at the crease between deliveries.
      const priorEntries = entries.slice(0, -MIN_FRAMES_FOR_TRIGGER);
      if (priorEntries.length === 0) return null;
      const wasOutside = priorEntries.some((e) => {
        const nx = e.kf.ankle.x / videoWidth;
        return nx < CREASE_ZONE_X_MIN || nx > CREASE_ZONE_X_MAX;
      });
      if (!wasOutside) return null;

      // Compute velocity (heights/sec) and acceleration (widths/sec^2)
      // from the analysis window.
      const velocitiesY: number[] = [];
      const accelerationsX: number[] = [];

      for (let i = 1; i < window.length; i++) {
        const dtSec = (window[i].timestamp - window[i - 1].timestamp) / 1000;
        if (dtSec <= 0) continue;

        const dyNorm = (window[i].kf.ankle.y / videoHeight) - (window[i - 1].kf.ankle.y / videoHeight);
        const dxNorm = (window[i].kf.ankle.x / videoWidth) - (window[i - 1].kf.ankle.x / videoWidth);

        velocitiesY.push(dyNorm / dtSec);

        if (i >= 2) {
          const dtSecPrev = (window[i - 1].timestamp - window[i - 2].timestamp) / 1000;
          if (dtSecPrev > 0) {
            const dxNormPrev =
              (window[i - 1].kf.ankle.x / videoWidth) - (window[i - 2].kf.ankle.x / videoWidth);
            const vxCurr = dxNorm / dtSec;
            const vxPrev = dxNormPrev / dtSecPrev;
            const dtSecMid = (dtSec + dtSecPrev) / 2;
            accelerationsX.push((vxCurr - vxPrev) / dtSecMid);
          }
        }
      }

      if (velocitiesY.length === 0 || accelerationsX.length === 0) return null;

      // Cue 2: Vertical velocity near zero (foot has stopped descending).
      const latestVy = velocitiesY[velocitiesY.length - 1];
      const vyNearZero = Math.abs(latestVy) < VELOCITY_ZERO_THRESHOLD;

      // Cue 3: Horizontal deceleration (braking on impact).
      // Use the most negative (strongest braking) acceleration in the
      // recent window rather than just the latest frame, since the peak
      // braking impulse may lag by 1-2 frames.
      const peakBraking = Math.min(...accelerationsX);
      const isBraking = peakBraking < -DECEL_THRESHOLD;

      if (!vyNearZero || !isBraking) return null;

      // All three cues passed — trigger!
      lastTriggerTime.current = latest.timestamp;
      return latest.timestamp;
    },
    [inCooldown],
  );

  return { check, startCooldown, inCooldown, reset };
}
