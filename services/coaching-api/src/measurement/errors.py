class ThermalThrottleError(Exception):
    """Raised when frame pacing jitter exceeds the hardware audit threshold
    (PRD §3.2 / §6: ERR_THERMAL_THROTTLE). The clip should be rejected, not
    silently analyzed with corrupted timing."""

    code = "ERR_THERMAL_THROTTLE"

    def __init__(self, jitter_pct: float, threshold_pct: float):
        self.jitter_pct = jitter_pct
        self.threshold_pct = threshold_pct
        super().__init__(
            f"Frame pacing jitter {jitter_pct:.1f}% exceeds the {threshold_pct:.1f}% threshold"
        )
