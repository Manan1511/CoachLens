import { describe, expect, it } from 'vitest';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { POSE_LANDMARK } from './usePoseLandmarker';
import {
  bowlingArmSide,
  extractKeypointFrame,
  frontLegSide,
  toPixelSpace,
} from './extractKeypointFrame';

/** CAPTURE_PLAN.md Milestone 2's required cross-check: this doesn't
 *  reimplement `services/coaching-api/src/interpretation/angles.py`'s
 *  angle math (extraction and interpretation are deliberately different
 *  layers - the backend owns the formula, this owns getting correct
 *  geometry to it). Instead it ports the exact same synthetic coordinate
 *  cases from `services/coaching-api/tests/test_interpretation.py`
 *  (co-linear -> 180°, perpendicular -> 90°, directly-above -> 0°,
 *  45-degrees-forward -> 45°) and runs the *same* vector-angle formula
 *  against this module's *pixel-space output*. If extraction's pixel
 *  conversion or landmark selection were wrong, these known-answer cases
 *  would stop agreeing with the backend's own test suite - that agreement
 *  is the actual cross-check, not just "this function returns numbers". */

function angleBetweenDeg(u: [number, number], v: [number, number]): number {
  const dot = u[0] * v[0] + u[1] * v[1];
  const magU = Math.hypot(...u);
  const magV = Math.hypot(...v);
  const cosTheta = Math.max(-1, Math.min(1, dot / (magU * magV)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

function frontKneeAngleDeg(hip: { x: number; y: number }, knee: { x: number; y: number }, ankle: { x: number; y: number }) {
  return angleBetweenDeg([hip.x - knee.x, hip.y - knee.y], [ankle.x - knee.x, ankle.y - knee.y]);
}

function forwardTrunkTiltDeg(hip: { x: number; y: number }, shoulder: { x: number; y: number }) {
  return angleBetweenDeg([shoulder.x - hip.x, shoulder.y - hip.y], [0, -1]);
}

describe('toPixelSpace', () => {
  it('converts normalized [0,1] coordinates to true pixel space using each axis independently', () => {
    // A non-square frame is the case that actually matters: if x and y used
    // the same scale factor, this would silently be wrong on any real
    // camera frame (see the module's own comment on why this runs first).
    const landmark: NormalizedLandmark = { x: 0.5, y: 0.25, z: 0, visibility: 0.9 };
    expect(toPixelSpace(landmark, 1280, 720)).toEqual({ x: 640, y: 180, conf: 0.9 });
  });
});

describe('frontLegSide / bowlingArmSide', () => {
  it('front leg is opposite the bowling arm; wrist side is the bowling arm itself', () => {
    expect(frontLegSide('RIGHT')).toBe('left');
    expect(frontLegSide('LEFT')).toBe('right');
    expect(bowlingArmSide('RIGHT')).toBe('right');
    expect(bowlingArmSide('LEFT')).toBe('left');
  });
});

describe('extractKeypointFrame', () => {
  const W = 1000;
  const H = 1000;

  function landmarks(overrides: Partial<Record<number, NormalizedLandmark>>): NormalizedLandmark[] {
    const base: NormalizedLandmark = { x: 0, y: 0, z: 0, visibility: 1 };
    const arr = Array.from({ length: 33 }, () => ({ ...base }));
    for (const [index, lm] of Object.entries(overrides)) arr[Number(index)] = lm!;
    return arr;
  }

  it('returns null without a bowling_arm - front leg is unknown, not guessable', () => {
    const lms = landmarks({});
    expect(extractKeypointFrame(lms, 0, 0, W, H, null)).toBeNull();
  });

  it('returns null with no detected pose', () => {
    expect(extractKeypointFrame([], 0, 0, W, H, 'RIGHT')).toBeNull();
  });

  it('right-arm bowler: knee/ankle from the LEFT leg, wrist from the RIGHT arm', () => {
    const lms = landmarks({
      [POSE_LANDMARK.leftKnee]: { x: 0.1, y: 0.1, z: 0, visibility: 0.9 },
      [POSE_LANDMARK.rightKnee]: { x: 0.9, y: 0.9, z: 0, visibility: 0.9 },
      [POSE_LANDMARK.leftAnkle]: { x: 0.2, y: 0.2, z: 0, visibility: 0.9 },
      [POSE_LANDMARK.rightAnkle]: { x: 0.8, y: 0.8, z: 0, visibility: 0.9 },
      [POSE_LANDMARK.leftWrist]: { x: 0.3, y: 0.3, z: 0, visibility: 0.9 },
      [POSE_LANDMARK.rightWrist]: { x: 0.7, y: 0.7, z: 0, visibility: 0.9 },
    });
    const result = extractKeypointFrame(lms, 5, 208.3, W, H, 'RIGHT');
    expect(result?.knee).toEqual({ x: 100, y: 100, conf: 0.9 });
    expect(result?.ankle).toEqual({ x: 200, y: 200, conf: 0.9 });
    expect(result?.wrist).toEqual({ x: 700, y: 700, conf: 0.9 }); // right wrist, not left
    expect(result?.frame).toBe(5);
    expect(result?.t_ms).toBe(208.3);
  });

  it('left-arm bowler: knee/ankle from the RIGHT leg, wrist from the LEFT arm', () => {
    const lms = landmarks({
      [POSE_LANDMARK.leftKnee]: { x: 0.1, y: 0.1, z: 0, visibility: 0.9 },
      [POSE_LANDMARK.rightKnee]: { x: 0.9, y: 0.9, z: 0, visibility: 0.9 },
      [POSE_LANDMARK.leftWrist]: { x: 0.3, y: 0.3, z: 0, visibility: 0.9 },
      [POSE_LANDMARK.rightWrist]: { x: 0.7, y: 0.7, z: 0, visibility: 0.9 },
    });
    const result = extractKeypointFrame(lms, 0, 0, W, H, 'LEFT');
    expect(result?.knee).toEqual({ x: 900, y: 900, conf: 0.9 });
    expect(result?.wrist).toEqual({ x: 300, y: 300, conf: 0.9 }); // left wrist, not right
  });

  it('hip and shoulder are bilateral midpoints, taking the weaker side\'s confidence', () => {
    const lms = landmarks({
      [POSE_LANDMARK.leftHip]: { x: 0.2, y: 0.4, z: 0, visibility: 0.95 },
      [POSE_LANDMARK.rightHip]: { x: 0.6, y: 0.8, z: 0, visibility: 0.55 },
      [POSE_LANDMARK.leftShoulder]: { x: 0.1, y: 0.1, z: 0, visibility: 0.5 },
      [POSE_LANDMARK.rightShoulder]: { x: 0.3, y: 0.3, z: 0, visibility: 0.99 },
    });
    const result = extractKeypointFrame(lms, 0, 0, W, H, 'RIGHT');
    expect(result?.hip).toEqual({ x: 400, y: 600, conf: 0.55 });
    expect(result?.shoulder).toEqual({ x: 200, y: 200, conf: 0.5 });
  });

  // The actual backend cross-check: same synthetic cases as
  // test_interpretation.py, same expected angles, computed here from this
  // module's pixel-space output rather than fabricated coordinates.
  it('co-linear hip/knee/ankle -> 180°, matching test_interpretation.py::test_front_knee_angle_straight_leg', () => {
    const lms = landmarks({
      [POSE_LANDMARK.leftHip]: { x: 0.1, y: 0.0, z: 0, visibility: 1 },
      [POSE_LANDMARK.rightHip]: { x: 0.1, y: 0.0, z: 0, visibility: 1 },
      [POSE_LANDMARK.leftKnee]: { x: 0.1, y: 0.1, z: 0, visibility: 1 },
      [POSE_LANDMARK.leftAnkle]: { x: 0.1, y: 0.2, z: 0, visibility: 1 },
    });
    const f = extractKeypointFrame(lms, 0, 0, W, H, 'RIGHT')!;
    expect(frontKneeAngleDeg(f.hip, f.knee, f.ankle)).toBeCloseTo(180.0, 1);
  });

  it('perpendicular hip/knee/ankle -> 90°, matching test_front_knee_angle_perpendicular', () => {
    const lms = landmarks({
      [POSE_LANDMARK.leftHip]: { x: 0.1, y: 0.0, z: 0, visibility: 1 },
      [POSE_LANDMARK.rightHip]: { x: 0.1, y: 0.0, z: 0, visibility: 1 },
      [POSE_LANDMARK.leftKnee]: { x: 0.1, y: 0.1, z: 0, visibility: 1 },
      [POSE_LANDMARK.leftAnkle]: { x: 0.2, y: 0.1, z: 0, visibility: 1 },
    });
    const f = extractKeypointFrame(lms, 0, 0, W, H, 'RIGHT')!;
    expect(frontKneeAngleDeg(f.hip, f.knee, f.ankle)).toBeCloseTo(90.0, 1);
  });

  it('shoulder directly above hip -> 0° trunk tilt, matching test_forward_trunk_tilt_upright', () => {
    const lms = landmarks({
      [POSE_LANDMARK.leftHip]: { x: 0.1, y: 0.2, z: 0, visibility: 1 },
      [POSE_LANDMARK.rightHip]: { x: 0.1, y: 0.2, z: 0, visibility: 1 },
      [POSE_LANDMARK.leftShoulder]: { x: 0.1, y: 0.0, z: 0, visibility: 1 },
      [POSE_LANDMARK.rightShoulder]: { x: 0.1, y: 0.0, z: 0, visibility: 1 },
    });
    const f = extractKeypointFrame(lms, 0, 0, W, H, 'RIGHT')!;
    expect(forwardTrunkTiltDeg(f.hip, f.shoulder)).toBeCloseTo(0.0, 1);
  });

  it('shoulder 45° forward-and-up from hip -> 45° trunk tilt, matching test_forward_trunk_tilt_45deg', () => {
    const lms = landmarks({
      [POSE_LANDMARK.leftHip]: { x: 0.1, y: 0.2, z: 0, visibility: 1 },
      [POSE_LANDMARK.rightHip]: { x: 0.1, y: 0.2, z: 0, visibility: 1 },
      [POSE_LANDMARK.leftShoulder]: { x: 0.2, y: 0.1, z: 0, visibility: 1 },
      [POSE_LANDMARK.rightShoulder]: { x: 0.2, y: 0.1, z: 0, visibility: 1 },
    });
    const f = extractKeypointFrame(lms, 0, 0, W, H, 'RIGHT')!;
    expect(forwardTrunkTiltDeg(f.hip, f.shoulder)).toBeCloseTo(45.0, 1);
  });
});
