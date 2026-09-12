import numpy as np

from src.schemas.delivery import KeypointFrame


def detect_ffs_frame(frames: list[KeypointFrame]) -> int:
    """Multi-cue Front Foot Strike detector (PRD §6.1). Fuses three cues into
    a single contact score and returns the *frame number* (KeypointFrame.frame,
    not the list index — these differ whenever frames were dropped) with the
    highest score:

      1. ankle vertical velocity near zero (foot has stopped descending)
      2. ankle at its lowest point on screen — largest y in image coordinates,
         i.e. closest to the ground (PRD's y_ground_max)
      3. horizontal deceleration of the ankle (braking on impact)

    PRD §6.1 defines a weighted sum (w1, w2, w3) without specifying weights
    ("pending Stage 1 calibration" elsewhere in the doc) — equal weighting is
    used here as an explicit, documented placeholder, not a derived value.
    """
    if len(frames) < 3:
        raise ValueError("Need at least 3 frames to detect FFS (velocity/acceleration require neighbors).")

    t = np.array([f.t_ms for f in frames])
    ys = np.array([f.ankle.y for f in frames])
    xs = np.array([f.ankle.x for f in frames])

    vy = np.gradient(ys, t)
    ax = np.gradient(np.gradient(xs, t), t)

    cue_velocity = 1.0 / (1.0 + np.abs(vy))

    y_range = ys.max() - ys.min()
    cue_height = np.ones_like(ys) if y_range == 0 else 1.0 - (ys.max() - ys) / y_range

    braking = np.clip(-ax, 0, None)
    cue_deceleration = np.zeros_like(braking) if braking.max() == 0 else braking / braking.max()

    score = cue_velocity + cue_height + cue_deceleration
    best_index = int(np.argmax(score))
    return frames[best_index].frame


def detect_release_frame(frames: list[KeypointFrame]) -> int:
    """Release-frame detector: ball release occurs when the bowling arm is
    extended overhead, approximated here as the frame where the wrist reaches
    its highest point on screen (smallest y in image coordinates) relative to
    the shoulder. Requires wrist + shoulder on every frame (see
    BACKEND_PLAN.md — wrist was added to the contract specifically for this).
    """
    usable = [f for f in frames if f.wrist is not None and f.shoulder is not None]
    if not usable:
        raise ValueError("No frames have both wrist and shoulder landmarks; cannot detect release frame.")

    def wrist_height_above_shoulder(frame: KeypointFrame) -> float:
        return frame.shoulder.y - frame.wrist.y  # larger = wrist further above shoulder

    best_frame = max(usable, key=wrist_height_above_shoulder)
    return best_frame.frame
