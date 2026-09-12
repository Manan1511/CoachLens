from dataclasses import dataclass

from src.schemas.status import DeliveryStatus, WindowPattern

DEFAULT_UNCERTAINTY_THRESHOLD_DEG = 3.2
ROLLING_WINDOW_SIZE = 5
ROLLING_WINDOW_MATCH_THRESHOLD = 3


@dataclass
class DeviationResult:
    status: DeliveryStatus
    delta_deg: float
    uncertainty_band_deg: float
    window_pattern: WindowPattern
    window_matches: int


def evaluate_delivery_deviation(
    observed_deg: float,
    fixed_baseline_median_deg: float,
    fixed_baseline_iqr_deg: float,
    rolling_history_deltas: list[float],
    uncertainty_threshold_deg: float = DEFAULT_UNCERTAINTY_THRESHOLD_DEG,
) -> DeviationResult:
    """Dual-baseline triangulation + 3-of-5 rolling window (PRD §6.2), ported
    from the reference pseudocode with MECHANICAL_WATCH replacing the
    markdown's UNCLASSIFIED_DEVIATION — see BACKEND_PLAN.md's
    resolved-conflicts notes for why.

    Confidence gating (DATA_SUPPRESSED) happens upstream in the measurement
    layer's quality firewall; by the time an observed_deg reaches here it's
    assumed already validated as usable.

    rolling_history_deltas: deltas (observed - fixed_baseline_median) from
    up to the last 4 valid deliveries, oldest first. Rolling 6-week median
    baseline is deferred (BACKEND_PLAN.md Milestone 4) — only the fixed
    reference baseline is evaluated here.

    uncertainty_band_deg in the result is the same threshold used for
    outlier classification (matches the PRD §7.2 example's populated
    numeric value), not a computed statistical residual — that requires
    Stage 1 validation data that doesn't exist yet.
    """
    delta = observed_deg - fixed_baseline_median_deg
    outlier_threshold = max(uncertainty_threshold_deg, 1.5 * fixed_baseline_iqr_deg)
    is_outlier = abs(delta) > outlier_threshold

    if not is_outlier:
        return DeviationResult(
            status=DeliveryStatus.FORM_BENCHMARK,
            delta_deg=delta,
            uncertainty_band_deg=uncertainty_threshold_deg,
            window_pattern=WindowPattern.NOT_APPLICABLE,
            window_matches=0,
        )

    recent_deltas = rolling_history_deltas[-(ROLLING_WINDOW_SIZE - 1):] + [delta]
    matching = sum(
        1 for d in recent_deltas if d * delta > 0 and abs(d) > uncertainty_threshold_deg
    )

    if matching >= ROLLING_WINDOW_MATCH_THRESHOLD:
        return DeviationResult(
            status=DeliveryStatus.TECHNICAL_CONCERN,
            delta_deg=delta,
            uncertainty_band_deg=uncertainty_threshold_deg,
            window_pattern=WindowPattern.THREE_OF_FIVE_MATCHED,
            window_matches=matching,
        )

    return DeviationResult(
        status=DeliveryStatus.MECHANICAL_WATCH,
        delta_deg=delta,
        uncertainty_band_deg=uncertainty_threshold_deg,
        window_pattern=WindowPattern.ISOLATED,
        window_matches=matching,
    )
