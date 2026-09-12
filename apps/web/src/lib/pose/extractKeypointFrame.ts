import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { BowlingArm } from '@/lib/api/types';
import { POSE_LANDMARK } from './usePoseLandmarker';

/** CAPTURE_PLAN.md Milestone 2: turns one MediaPipe detection result into
 *  one wire-format frame of `services/coaching-api`'s `KeypointFrame`
 *  schema (`src/schemas/delivery.py`). Kept as a pure function, not a hook -
 *  it has no lifecycle of its own, and a pure function is what a unit test
 *  can call directly against synthetic landmarks. */

export interface PixelLandmark {
  x: number;
  y: number;
  conf: number;
}

export interface KeypointFrame {
  frame: number;
  t_ms: number;
  knee: PixelLandmark;
  hip: PixelLandmark;
  ankle: PixelLandmark;
  shoulder: PixelLandmark;
  wrist: PixelLandmark;
}

/** MediaPipe's landmarks are normalized [0,1] per axis; `angles.py`'s vector
 *  math has no notion of aspect ratio, so a frame that isn't square would
 *  silently distort every angle if sent un-converted (a unit step in
 *  normalized x and normalized y represent different real distances unless
 *  width == height). Must run before anything touches these coordinates. */
export function toPixelSpace(
  landmark: NormalizedLandmark,
  videoWidth: number,
  videoHeight: number,
): PixelLandmark {
  return { x: landmark.x * videoWidth, y: landmark.y * videoHeight, conf: landmark.visibility };
}

/** A midpoint's confidence is only as good as its weaker input - averaging
 *  the two confidences would let one well-tracked side mask the other one
 *  being poorly tracked, which is exactly the failure mode the backend's
 *  `conf < 0.70` firewall (CAPTURE_PLAN.md §2) exists to catch. */
function midpoint(a: PixelLandmark, b: PixelLandmark): PixelLandmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, conf: Math.min(a.conf, b.conf) };
}

/** The front (landing) leg is the one opposite the bowling arm - a
 *  right-arm bowler drives off and lands on the left leg. This is the same
 *  fact BACKEND_PLAN.md's Milestone 9 notes and CapturePage.tsx's tripod
 *  guidance both already depend on; kept here as the single place it's
 *  encoded for keypoint extraction specifically. */
export function frontLegSide(bowlingArm: BowlingArm): 'left' | 'right' {
  return bowlingArm === 'RIGHT' ? 'left' : 'right';
}

/** Distinct from frontLegSide, and deliberately not derived from it: the
 *  wrist needed for release-frame detection ("arm extended overhead", PRD
 *  §5 Metric 2) is the bowling arm's *own* wrist, not the front leg's side. */
export function bowlingArmSide(bowlingArm: BowlingArm): 'left' | 'right' {
  return bowlingArm === 'RIGHT' ? 'right' : 'left';
}

/** Returns null when there isn't enough to build a valid frame - no
 *  `bowling_arm` on the athlete (front leg is then genuinely unknown, not a
 *  guessable default) or MediaPipe found no pose this frame. The caller
 *  should skip the frame, not send a half-populated one: `hip`/`knee`/
 *  `ankle` are non-optional in the schema, and a wrong guess would silently
 *  corrupt the geometry rather than visibly fail. */
export function extractKeypointFrame(
  landmarks: NormalizedLandmark[],
  frame: number,
  tMs: number,
  videoWidth: number,
  videoHeight: number,
  bowlingArm: BowlingArm | null,
): KeypointFrame | null {
  if (!bowlingArm || landmarks.length === 0 || videoWidth <= 0 || videoHeight <= 0) return null;

  const px = (index: number) => toPixelSpace(landmarks[index], videoWidth, videoHeight);

  const legSide = frontLegSide(bowlingArm);
  const armSide = bowlingArmSide(bowlingArm);

  const knee = px(legSide === 'left' ? POSE_LANDMARK.leftKnee : POSE_LANDMARK.rightKnee);
  const ankle = px(legSide === 'left' ? POSE_LANDMARK.leftAnkle : POSE_LANDMARK.rightAnkle);
  const wrist = px(armSide === 'left' ? POSE_LANDMARK.leftWrist : POSE_LANDMARK.rightWrist);

  // hip and shoulder are bilateral midpoints, not side-specific, matching
  // the PRD's own vertex definitions ("mid-pelvis", "mid-shoulder") -
  // unlike knee/ankle/wrist, these are the same regardless of bowling_arm.
  const hip = midpoint(px(POSE_LANDMARK.leftHip), px(POSE_LANDMARK.rightHip));
  const shoulder = midpoint(px(POSE_LANDMARK.leftShoulder), px(POSE_LANDMARK.rightShoulder));

  return { frame, t_ms: tMs, knee, hip, ankle, shoulder, wrist };
}
