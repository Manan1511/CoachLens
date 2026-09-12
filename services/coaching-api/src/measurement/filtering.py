import numpy as np
from scipy.signal import butter, filtfilt

from src.schemas.delivery import KeypointFrame, Landmark

DEFAULT_CUTOFF_HZ = 6.0
"""6 Hz is a standard low-pass cutoff for human gait/impact kinematics
(Winter's gait-analysis convention). PRD §4 leaves f_c "calibrated against
ground truth" without specifying a number pending Stage 1 validation."""

DEFAULT_ORDER = 4

_LANDMARK_FIELDS = ("knee", "hip", "ankle", "shoulder", "wrist")


def butterworth_filter_frames(
    frames: list[KeypointFrame],
    fps: int,
    cutoff_hz: float = DEFAULT_CUTOFF_HZ,
    order: int = DEFAULT_ORDER,
) -> list[KeypointFrame]:
    """Zero-phase forward-backward Butterworth low-pass filter (PRD §4 Layer
    1), applied independently to the x/y of each landmark. Confidence values
    pass through unfiltered — smoothing a confidence score would misrepresent
    it as a measured quantity.

    A landmark present in only some frames (shoulder/wrist are optional) is
    filtered only if every frame in this delivery has it; otherwise it's left
    as-is, since scipy's filtfilt has no defined behavior for missing samples.
    """
    b, a = butter(order, cutoff_hz, fs=fps, btype="low")
    padlen = 3 * max(len(a), len(b))
    if len(frames) <= padlen:
        raise ValueError(
            f"Need more than {padlen} frames for a stable zero-phase filter at "
            f"order={order}; got {len(frames)}."
        )

    filtered = [f.model_copy(deep=True) for f in frames]

    for field in _LANDMARK_FIELDS:
        landmarks = [getattr(f, field) for f in frames]
        if any(lm is None for lm in landmarks):
            continue

        xs = np.array([lm.x for lm in landmarks])
        ys = np.array([lm.y for lm in landmarks])
        xs_filtered = filtfilt(b, a, xs)
        ys_filtered = filtfilt(b, a, ys)

        for i, target_frame in enumerate(filtered):
            original: Landmark = getattr(target_frame, field)
            setattr(
                target_frame,
                field,
                Landmark(x=float(xs_filtered[i]), y=float(ys_filtered[i]), conf=original.conf),
            )

    return filtered
