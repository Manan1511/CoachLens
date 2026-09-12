import { describe, it, expect } from 'vitest';

/** Unit tests for the ring buffer and crease trigger logic.
 *  These test the pure data-structure and signal-detection logic
 *  without React hooks — we construct the same data structures
 *  the hooks operate on and test them directly. */

// --- Ring Buffer tests (testing the logic, not the hook wrapper) ---

interface RingEntry {
  kf: { ankle: { x: number; y: number; conf: number }; [key: string]: unknown };
  timestamp: number;
}

const RING_BUFFER_DURATION_MS = 2500;

/** Minimal ring buffer implementation matching useRingBuffer's logic,
 *  extracted here so tests don't depend on React. */
function createRingBuffer() {
  const MAX_CAPACITY = Math.ceil((RING_BUFFER_DURATION_MS / 1000) * 120);
  let buffer: RingEntry[] = [];

  return {
    push(entry: RingEntry) {
      buffer.push(entry);
      if (buffer.length > MAX_CAPACITY) {
        buffer.splice(0, buffer.length - MAX_CAPACITY);
      }
      const cutoff = entry.timestamp - RING_BUFFER_DURATION_MS;
      let firstValid = 0;
      while (firstValid < buffer.length && buffer[firstValid].timestamp < cutoff) {
        firstValid++;
      }
      if (firstValid > 0) {
        buffer.splice(0, firstValid);
      }
    },
    slice(fromMs: number, toMs: number): RingEntry[] {
      return buffer.filter((e) => e.timestamp >= fromMs && e.timestamp <= toMs);
    },
    size(): number {
      return buffer.length;
    },
    clear() {
      buffer = [];
    },
    recent(n: number): RingEntry[] {
      return buffer.slice(Math.max(0, buffer.length - n));
    },
  };
}

function makeEntry(timestamp: number, ankleX = 100, ankleY = 200, conf = 0.9): RingEntry {
  return {
    kf: {
      frame: Math.floor(timestamp),
      t_ms: timestamp,
      ankle: { x: ankleX, y: ankleY, conf },
      knee: { x: 100, y: 150, conf: 0.9 },
      hip: { x: 100, y: 100, conf: 0.9 },
      shoulder: { x: 100, y: 50, conf: 0.9 },
      wrist: { x: 120, y: 30, conf: 0.9 },
    },
    timestamp,
  };
}

describe('Ring Buffer', () => {
  it('accepts entries and reports correct size', () => {
    const buf = createRingBuffer();
    buf.push(makeEntry(0));
    buf.push(makeEntry(100));
    buf.push(makeEntry(200));
    expect(buf.size()).toBe(3);
  });

  it('evicts entries older than RING_BUFFER_DURATION_MS', () => {
    const buf = createRingBuffer();
    buf.push(makeEntry(0));
    buf.push(makeEntry(1000));
    buf.push(makeEntry(2000));
    // Push entry at 3000ms — entry at 0ms is now 3000ms old, > 2500ms
    buf.push(makeEntry(3000));
    expect(buf.size()).toBe(3); // 1000, 2000, 3000
    // The 0ms entry should be evicted
    const all = buf.slice(0, 3000);
    expect(all[0].timestamp).toBe(1000);
  });

  it('slices correctly by timestamp range', () => {
    const buf = createRingBuffer();
    for (let i = 0; i <= 2000; i += 100) {
      buf.push(makeEntry(i));
    }
    const sliced = buf.slice(500, 1000);
    expect(sliced.length).toBe(6); // 500, 600, 700, 800, 900, 1000
    expect(sliced[0].timestamp).toBe(500);
    expect(sliced[sliced.length - 1].timestamp).toBe(1000);
  });

  it('returns empty slice for out-of-range timestamps', () => {
    const buf = createRingBuffer();
    buf.push(makeEntry(100));
    buf.push(makeEntry(200));
    const sliced = buf.slice(500, 1000);
    expect(sliced.length).toBe(0);
  });

  it('clear() empties the buffer', () => {
    const buf = createRingBuffer();
    buf.push(makeEntry(0));
    buf.push(makeEntry(100));
    buf.clear();
    expect(buf.size()).toBe(0);
  });

  it('recent(n) returns the last n entries', () => {
    const buf = createRingBuffer();
    buf.push(makeEntry(0));
    buf.push(makeEntry(100));
    buf.push(makeEntry(200));
    buf.push(makeEntry(300));
    const last2 = buf.recent(2);
    expect(last2.length).toBe(2);
    expect(last2[0].timestamp).toBe(200);
    expect(last2[1].timestamp).toBe(300);
  });

  it('recent(n) returns fewer than n if buffer has fewer', () => {
    const buf = createRingBuffer();
    buf.push(makeEntry(0));
    const last5 = buf.recent(5);
    expect(last5.length).toBe(1);
  });
});

// --- Crease Trigger tests ---

const CREASE_ZONE_X_MIN = 0.25;
const CREASE_ZONE_X_MAX = 0.75;
const VELOCITY_ZERO_THRESHOLD = 0.35;
const DECEL_THRESHOLD = 2.0;
const MIN_FRAMES_FOR_TRIGGER = 5;
const MIN_ANKLE_CONF = 0.50;

/** Minimal crease trigger check matching useCreaseTrigger's logic,
 *  extracted here so tests don't depend on React hooks. */
function checkTrigger(
  entries: RingEntry[],
  videoWidth: number,
  videoHeight: number,
): boolean {
  if (entries.length < MIN_FRAMES_FOR_TRIGGER) return false;

  const window = entries.slice(-MIN_FRAMES_FOR_TRIGGER);
  const latest = window[window.length - 1];

  if (latest.kf.ankle.conf < MIN_ANKLE_CONF) return false;

  const normX = latest.kf.ankle.x / videoWidth;
  if (normX < CREASE_ZONE_X_MIN || normX > CREASE_ZONE_X_MAX) return false;

  // Entry transition: ankle must have been outside crease zone in prior frames
  const priorEntries = entries.slice(0, -MIN_FRAMES_FOR_TRIGGER);
  if (priorEntries.length === 0) return false;
  const wasOutside = priorEntries.some((e) => {
    const nx = e.kf.ankle.x / videoWidth;
    return nx < CREASE_ZONE_X_MIN || nx > CREASE_ZONE_X_MAX;
  });
  if (!wasOutside) return false;

  // Compute velocity (heights/sec) and acceleration (widths/sec^2)
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

  if (velocitiesY.length === 0 || accelerationsX.length === 0) return false;

  const latestVy = velocitiesY[velocitiesY.length - 1];
  const vyNearZero = Math.abs(latestVy) < VELOCITY_ZERO_THRESHOLD;

  const peakBraking = Math.min(...accelerationsX);
  const isBraking = peakBraking < -DECEL_THRESHOLD;

  return vyNearZero && isBraking;
}

describe('Crease Trigger', () => {
  const W = 640;
  const H = 480;

  it('does NOT trigger with too few frames', () => {
    const entries = [makeEntry(0), makeEntry(33), makeEntry(66)];
    expect(checkTrigger(entries, W, H)).toBe(false);
  });

  it('does NOT trigger when ankle is outside crease zone', () => {
    // Ankle at x=50 (normalised 50/640 = 0.078 < 0.25)
    const entries: RingEntry[] = [];
    for (let i = 0; i < 10; i++) {
      entries.push(makeEntry(i * 33, 50, 400, 0.9));
    }
    expect(checkTrigger(entries, W, H)).toBe(false);
  });

  it('does NOT trigger when ankle confidence is too low', () => {
    // Ankle inside crease zone but conf = 0.3
    const entries: RingEntry[] = [];
    for (let i = 0; i < 10; i++) {
      const x = i < 5 ? 50 : 320; // enters crease zone at frame 5
      entries.push(makeEntry(i * 100, x, 400, 0.3));
    }
    expect(checkTrigger(entries, W, H)).toBe(false);
  });

  it('does NOT trigger when ankle was already inside crease zone (no entry transition)', () => {
    // All frames inside the crease zone — no transition from outside
    const entries: RingEntry[] = [];
    for (let i = 0; i < 10; i++) {
      entries.push(makeEntry(i * 33, 320, 400, 0.9));
    }
    expect(checkTrigger(entries, W, H)).toBe(false);
  });

  it('triggers on a synthetic FFS-like sequence (entry + stop + braking)', () => {
    // Simulate: bowler runs in from the left (x < 0.25), enters crease zone,
    // foot descends then stops (y velocity → 0), horizontal deceleration.
    const entries: RingEntry[] = [];

    // Frames 0–5: ankle outside crease zone, moving right and down
    for (let i = 0; i < 6; i++) {
      entries.push(makeEntry(
        i * 33,
        50 + i * 40,     // x: 50 → 250 (entering crease at ~frame 3-4)
        300 + i * 20,     // y: descending
        0.9,
      ));
    }

    // Frames 6–9: ankle inside crease zone, foot has planted (y stops, x decelerates)
    for (let i = 6; i < 10; i++) {
      entries.push(makeEntry(
        i * 33,
        320,              // x: stationary inside crease zone
        420,              // y: stationary (foot on ground)
        0.9,
      ));
    }

    // The trigger should fire because:
    // 1. Ankle is inside crease zone (320/640 = 0.5)
    // 2. Ankle was outside zone in earlier frames (50/640 = 0.078)
    // 3. Vertical velocity is ~0 (y is constant at 420)
    // 4. Horizontal deceleration is present (x went from increasing to constant)
    expect(checkTrigger(entries, W, H)).toBe(true);
  });

  it('does NOT trigger during uniform motion (no deceleration)', () => {
    // Bowler enters crease zone but keeps running at constant speed
    const entries: RingEntry[] = [];
    for (let i = 0; i < 10; i++) {
      entries.push(makeEntry(
        i * 33,
        50 + i * 30,     // x: constant velocity rightward
        420,              // y: constant (foot level)
        0.9,
      ));
    }
    expect(checkTrigger(entries, W, H)).toBe(false);
  });
});
