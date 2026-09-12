import { useCallback, useRef } from 'react';
import { extractKeypointFrame } from './extractKeypointFrame';
import type { PoseFrame } from './usePoseLandmarker';
import type { BowlingArm, KeypointFrame } from '@/lib/api/types';

/** A fixed-capacity circular buffer that always holds the last
 *  RING_BUFFER_DURATION_MS of extracted KeypointFrame data. Runs
 *  continuously while Spell Mode is active.
 *
 *  Design: stores wire-format KeypointFrame (not raw NormalizedLandmark)
 *  so extraction happens on the insert path (amortised, one frame at a
 *  time) rather than the slice path (burst, needs to be fast when the
 *  trigger fires). The buffer is a plain array behind a useRef — no
 *  React state, no re-renders on every frame insertion. */

export const RING_BUFFER_DURATION_MS = 2500;

/** Maximum capacity assuming 120fps (the PRD's upper bound). At lower
 *  real fps the buffer won't fill to capacity, which is fine — slicing
 *  is by timestamp, not by index count. */
const MAX_CAPACITY = Math.ceil((RING_BUFFER_DURATION_MS / 1000) * 120);

export interface RingEntry {
  kf: KeypointFrame;
  timestamp: number;
}

export interface RingBufferHandle {
  /** Push a new frame into the buffer. Automatically evicts entries
   *  older than RING_BUFFER_DURATION_MS. */
  push: (entry: RingEntry) => void;

  /** Extract all entries whose timestamp falls within [fromMs, toMs].
   *  Returns a new array (safe to mutate). */
  slice: (fromMs: number, toMs: number) => RingEntry[];

  /** Number of entries currently in the buffer. */
  size: () => number;

  /** Drop all entries. */
  clear: () => void;

  /** Read the most recent N entries (newest last). Returns fewer than N
   *  if the buffer contains fewer. */
  recent: (n: number) => RingEntry[];
}

export function useRingBuffer(): RingBufferHandle {
  const bufferRef = useRef<RingEntry[]>([]);

  const push = useCallback((entry: RingEntry) => {
    const buf = bufferRef.current;
    buf.push(entry);

    // Evict by capacity (hard ceiling) — should rarely trigger since
    // the timestamp eviction below is the primary bound, but prevents
    // unbounded growth if timestamps are somehow non-monotonic.
    if (buf.length > MAX_CAPACITY) {
      buf.splice(0, buf.length - MAX_CAPACITY);
    }

    // Evict by age — drop everything older than RING_BUFFER_DURATION_MS
    // relative to the newest entry.
    const cutoff = entry.timestamp - RING_BUFFER_DURATION_MS;
    let firstValid = 0;
    while (firstValid < buf.length && buf[firstValid].timestamp < cutoff) {
      firstValid++;
    }
    if (firstValid > 0) {
      buf.splice(0, firstValid);
    }
  }, []);

  const slice = useCallback((fromMs: number, toMs: number): RingEntry[] => {
    return bufferRef.current.filter((e) => e.timestamp >= fromMs && e.timestamp <= toMs);
  }, []);

  const size = useCallback(() => bufferRef.current.length, []);

  const clear = useCallback(() => {
    bufferRef.current = [];
  }, []);

  const recent = useCallback((n: number): RingEntry[] => {
    const buf = bufferRef.current;
    return buf.slice(Math.max(0, buf.length - n));
  }, []);

  return { push, slice, size, clear, recent };
}

/** Convenience: feed a PoseFrame into the ring buffer by extracting the
 *  KeypointFrame first. Returns true if the frame was accepted (i.e.
 *  extraction succeeded — bowling arm set, landmarks present). */
export function feedRingBuffer(
  handle: RingBufferHandle,
  frame: PoseFrame,
  frameIndex: number,
  elapsedMs: number,
  videoWidth: number,
  videoHeight: number,
  bowlingArm: BowlingArm | null,
): boolean {
  const kf = extractKeypointFrame(frame.landmarks, frameIndex, elapsedMs, videoWidth, videoHeight, bowlingArm);
  if (!kf) return false;
  handle.push({ kf, timestamp: elapsedMs });
  return true;
}
