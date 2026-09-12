from src.schemas.delivery import KeypointFrame

MIN_LANDMARK_CONFIDENCE = 0.70


def passes_quality_firewall(frame: KeypointFrame, threshold: float = MIN_LANDMARK_CONFIDENCE) -> bool:
    """Quality firewall (PRD §1 invariant 5, §4 Layer 1): a frame is usable
    only if the landmarks its metric depends on are both above the
    confidence threshold. Checks knee+hip, which the Front Knee Extension
    metric requires at the FFS frame.
    """
    return frame.knee.conf >= threshold and frame.hip.conf >= threshold


def passes_trunk_tilt_quality_firewall(
    frame: KeypointFrame, threshold: float = MIN_LANDMARK_CONFIDENCE
) -> bool:
    """Same gate, but for the Forward Trunk Tilt metric, which needs hip and
    shoulder rather than knee and hip."""
    return frame.shoulder is not None and frame.hip.conf >= threshold and frame.shoulder.conf >= threshold
