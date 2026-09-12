from src.measurement.errors import ThermalThrottleError
from src.schemas.delivery import KeypointFrame

DEFAULT_JITTER_THRESHOLD_PCT = 8.0


def audit_frame_pacing(
    frames: list[KeypointFrame],
    fps: int,
    jitter_threshold_pct: float = DEFAULT_JITTER_THRESHOLD_PCT,
) -> None:
    """Hardware thermal audit (PRD §3.2 / §4 Layer 1): validates frame
    timestamp continuity independently of the client-reported
    capture_metadata.pacing_jitter_pct, rather than trusting a self-reported
    number for a check whose entire point is catching bad captures.

    Raises ThermalThrottleError if any consecutive-frame gap deviates from
    the expected inter-frame interval by more than jitter_threshold_pct.
    """
    if len(frames) < 2:
        return

    expected_dt_ms = 1000.0 / fps
    max_jitter_pct = 0.0
    for a, b in zip(frames, frames[1:]):
        actual_dt_ms = b.t_ms - a.t_ms
        jitter_pct = abs(actual_dt_ms - expected_dt_ms) / expected_dt_ms * 100
        max_jitter_pct = max(max_jitter_pct, jitter_pct)

    if max_jitter_pct > jitter_threshold_pct:
        raise ThermalThrottleError(max_jitter_pct, jitter_threshold_pct)
