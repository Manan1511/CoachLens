"""Temporary demo wiring: orchestrates measurement + interpretation with an
in-memory baseline/history store, standing in for the real Supabase
persistence and baseline retrieval that Milestone 5 will add. This exists so
the API is actually exercisable (e.g. via Swagger) before persistence lands
— DEMO_BASELINES/DEMO_ROLLING_HISTORY are process-local and reset on
restart, and are not the final design.
"""

from datetime import UTC, datetime

from src.interpretation.angles import front_knee_angle_deg
from src.interpretation.baseline import evaluate_delivery_deviation
from src.measurement.audit import audit_frame_pacing
from src.measurement.events import detect_ffs_frame
from src.measurement.filtering import butterworth_filter_frames
from src.measurement.quality import passes_quality_firewall
from src.schemas.delivery import DeliveryIngestionRequest, KeypointFrame
from src.schemas.report import Baselines, CoachingReport, Kinematics, ProposedAction, Verdict
from src.schemas.status import DeliveryStatus, WindowPattern

DEMO_BASELINES: dict[str, dict[str, tuple[float, float]]] = {
    "ATH-DEMO-01": {"front_knee_angle_deg": (148.0, 3.5)},
}
DEMO_ROLLING_HISTORY: dict[str, list[float]] = {}

DEMO_DRILL = ProposedAction(
    drill_id="DRL-SNC-012",
    title="Step-Down Landing Holds",
    prescription="3 sets x 6 reps off 12-inch box focusing on isometric extension.",
    contraindications=["patellar_tendon_pain", "acute_knee_swelling"],
    credential="UKCC Level 3 S&C Standard",
)

_STATUS_SUMMARIES = {
    DeliveryStatus.FORM_BENCHMARK: "Within established baseline range.",
    DeliveryStatus.MECHANICAL_WATCH: "Isolated deviation flagged for replay review.",
    DeliveryStatus.TECHNICAL_CONCERN: "Persistent deviation from baseline mechanics detected.",
    DeliveryStatus.DATA_SUPPRESSED: "Landmark visibility below threshold at the FFS frame.",
}


class UnknownBaselineError(Exception):
    """Raised when the athlete has no configured demo baseline."""


def evaluate_delivery(request: DeliveryIngestionRequest) -> CoachingReport:
    frames = request.raw_keypoints
    fps = request.capture_metadata.fps

    audit_frame_pacing(frames, fps=fps)  # raises ThermalThrottleError on bad pacing

    try:
        filtered = butterworth_filter_frames(frames, fps=fps)
    except ValueError:
        # Too few frames for a stable zero-phase filter (e.g. a short demo
        # payload). Proceeding unfiltered is acceptable for the demo path;
        # Milestone 6 should decide whether real ingestion should instead
        # reject short clips outright.
        filtered = frames

    ffs_frame_number = detect_ffs_frame(filtered)
    ffs_frame: KeypointFrame = next(f for f in filtered if f.frame == ffs_frame_number)

    kinematics = Kinematics(ffs_frame=ffs_frame_number)

    if not passes_quality_firewall(ffs_frame):
        return CoachingReport(
            report_id=f"RPT-{request.delivery_id}",
            delivery_id=request.delivery_id,
            evaluation_timestamp=datetime.now(UTC),
            kinematics=kinematics,
            baselines=Baselines(),
            verdict=Verdict(
                status=DeliveryStatus.DATA_SUPPRESSED,
                window_pattern=WindowPattern.NOT_APPLICABLE,
                summary=_STATUS_SUMMARIES[DeliveryStatus.DATA_SUPPRESSED],
            ),
        )

    knee_angle = front_knee_angle_deg(ffs_frame.hip, ffs_frame.knee, ffs_frame.ankle)
    kinematics.front_knee_angle_deg = knee_angle
    kinematics.front_knee_confidence = min(ffs_frame.knee.conf, ffs_frame.hip.conf)

    baseline = DEMO_BASELINES.get(request.athlete_id, {}).get("front_knee_angle_deg")
    if baseline is None:
        raise UnknownBaselineError(
            f"No demo baseline configured for athlete {request.athlete_id!r}; "
            f"use 'ATH-DEMO-01' or add one to DEMO_BASELINES."
        )
    median, iqr = baseline
    history = DEMO_ROLLING_HISTORY.setdefault(request.athlete_id, [])

    deviation = evaluate_delivery_deviation(
        observed_deg=knee_angle,
        fixed_baseline_median_deg=median,
        fixed_baseline_iqr_deg=iqr,
        rolling_history_deltas=history,
    )
    history.append(deviation.delta_deg)

    proposed_action = DEMO_DRILL if deviation.status == DeliveryStatus.TECHNICAL_CONCERN else None

    return CoachingReport(
        report_id=f"RPT-{request.delivery_id}",
        delivery_id=request.delivery_id,
        evaluation_timestamp=datetime.now(UTC),
        kinematics=kinematics,
        baselines=Baselines(
            fixed_reference_median_deg=median,
            fixed_reference_iqr_deg=iqr,
            delta_deg=deviation.delta_deg,
            uncertainty_band_deg=deviation.uncertainty_band_deg,
        ),
        verdict=Verdict(
            status=deviation.status,
            window_pattern=deviation.window_pattern,
            window_matches=deviation.window_matches,
            summary=_STATUS_SUMMARIES[deviation.status],
        ),
        proposed_action=proposed_action,
    )
