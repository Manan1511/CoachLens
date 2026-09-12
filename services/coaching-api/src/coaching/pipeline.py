"""Orchestrates measurement -> interpretation -> persistence for a delivery.
Supersedes the in-memory demo wiring used for Milestone 4's Swagger walkthrough
- that in-memory version is gone; this reads/writes real Supabase tables via
src/coaching/repository.py.
"""

from datetime import UTC, datetime

from src.coaching import repository
from src.interpretation.angles import front_knee_angle_deg
from src.interpretation.baseline import evaluate_delivery_deviation
from src.measurement.audit import audit_frame_pacing
from src.measurement.events import detect_ffs_frame
from src.measurement.filtering import butterworth_filter_frames
from src.measurement.quality import passes_quality_firewall
from src.schemas.delivery import DeliveryIngestionRequest, KeypointFrame
from src.schemas.report import Baselines, CoachingReport, Kinematics, Verdict
from src.schemas.status import DeliveryStatus, WindowPattern

FRONT_KNEE_METRIC = "front_knee_angle_deg"

_STATUS_SUMMARIES = {
    DeliveryStatus.FORM_BENCHMARK: "Within established baseline range.",
    DeliveryStatus.MECHANICAL_WATCH: "Isolated deviation flagged for replay review.",
    DeliveryStatus.TECHNICAL_CONCERN: "Persistent deviation from baseline mechanics detected.",
    DeliveryStatus.DATA_SUPPRESSED: "Landmark visibility below threshold at the FFS frame.",
}

# Only assigned when a delivery is flagged TECHNICAL_CONCERN for the knee
# metric. Real drill selection (matching deviation type to a drill library)
# is out of scope for Stage 1 - this is the one seeded drill (see
# scripts/seed.py) matching the PRD §7.2 example.
TECHNICAL_CONCERN_DRILL_ID = "DRL-SNC-012"


class UnknownBaselineError(Exception):
    """Raised when the athlete has no confirmed baseline for this metric yet."""


def _score_and_persist(delivery_id: str, athlete_id: str, ffs_frame_number: int, ffs_frame: KeypointFrame) -> CoachingReport:
    """Shared core of evaluate_delivery and nudge_and_reevaluate: given a
    chosen FFS frame (auto-detected or coach-nudged), runs the quality
    firewall + interpretation + persistence and builds the response.
    """
    kinematics = Kinematics(ffs_frame=ffs_frame_number)

    if not passes_quality_firewall(ffs_frame):
        verdict = Verdict(
            status=DeliveryStatus.DATA_SUPPRESSED,
            window_pattern=WindowPattern.NOT_APPLICABLE,
            summary=_STATUS_SUMMARIES[DeliveryStatus.DATA_SUPPRESSED],
        )
        repository.save_verdict(
            delivery_id=delivery_id,
            metric=FRONT_KNEE_METRIC,
            status=verdict.status,
            window_pattern=verdict.window_pattern,
            window_matches=0,
            delta_deg=None,
            uncertainty_band_deg=None,
            summary=verdict.summary,
            drill_id=None,
            event_frame=ffs_frame_number,
        )
        return CoachingReport(
            report_id=f"RPT-{delivery_id}",
            delivery_id=delivery_id,
            evaluation_timestamp=datetime.now(UTC),
            kinematics=kinematics,
            baselines=Baselines(),
            verdict=verdict,
        )

    knee_angle = front_knee_angle_deg(ffs_frame.hip, ffs_frame.knee, ffs_frame.ankle)
    kinematics.front_knee_angle_deg = knee_angle
    kinematics.front_knee_confidence = min(ffs_frame.knee.conf, ffs_frame.hip.conf)

    baseline = repository.get_baseline(athlete_id, FRONT_KNEE_METRIC)
    if baseline is None:
        raise UnknownBaselineError(
            f"Athlete {athlete_id!r} has no confirmed {FRONT_KNEE_METRIC} baseline. "
            f"Confirm one via POST /api/v1/athletes/{{athlete_id}}/baseline first."
        )

    history = repository.get_rolling_history_deltas(athlete_id, FRONT_KNEE_METRIC)
    deviation = evaluate_delivery_deviation(
        observed_deg=knee_angle,
        fixed_baseline_median_deg=baseline.median_deg,
        fixed_baseline_iqr_deg=baseline.iqr_deg,
        rolling_history_deltas=history,
    )

    drill_id = TECHNICAL_CONCERN_DRILL_ID if deviation.status == DeliveryStatus.TECHNICAL_CONCERN else None
    repository.save_verdict(
        delivery_id=delivery_id,
        metric=FRONT_KNEE_METRIC,
        status=deviation.status,
        window_pattern=deviation.window_pattern,
        window_matches=deviation.window_matches,
        delta_deg=deviation.delta_deg,
        uncertainty_band_deg=deviation.uncertainty_band_deg,
        summary=_STATUS_SUMMARIES[deviation.status],
        drill_id=drill_id,
        event_frame=ffs_frame_number,
        observed_value_deg=knee_angle,
        confidence=kinematics.front_knee_confidence,
        trigger_deltas=deviation.trigger_deltas or None,
    )
    proposed_action = repository.get_drill(drill_id) if drill_id else None

    return CoachingReport(
        report_id=f"RPT-{delivery_id}",
        delivery_id=delivery_id,
        evaluation_timestamp=datetime.now(UTC),
        kinematics=kinematics,
        baselines=Baselines(
            fixed_reference_median_deg=baseline.median_deg,
            fixed_reference_iqr_deg=baseline.iqr_deg,
            delta_deg=deviation.delta_deg,
            uncertainty_band_deg=deviation.uncertainty_band_deg,
        ),
        verdict=Verdict(
            status=deviation.status,
            window_pattern=deviation.window_pattern,
            window_matches=deviation.window_matches,
            trigger_context_deltas=deviation.trigger_deltas or None,
            summary=_STATUS_SUMMARIES[deviation.status],
        ),
        proposed_action=proposed_action,
    )


def _filtered_or_raw(frames: list[KeypointFrame], fps: int) -> list[KeypointFrame]:
    try:
        return butterworth_filter_frames(frames, fps=fps)
    except ValueError:
        # Too few frames for a stable zero-phase filter. Proceeding
        # unfiltered rather than rejecting the delivery outright; real
        # ingestion clips should always have enough frames at 60-120fps.
        return frames


def evaluate_delivery(request: DeliveryIngestionRequest) -> CoachingReport:
    frames = request.raw_keypoints
    fps = request.capture_metadata.fps

    audit_frame_pacing(frames, fps=fps)
    filtered = _filtered_or_raw(frames, fps)

    ffs_frame_number = detect_ffs_frame(filtered)
    ffs_frame = next(f for f in filtered if f.frame == ffs_frame_number)

    repository.save_delivery(request)
    return _score_and_persist(request.delivery_id, request.athlete_id, ffs_frame_number, ffs_frame)


def nudge_and_reevaluate(delivery_id: str, frame_delta: int) -> CoachingReport:
    """Re-runs the pipeline against a delivery's stored keypoints, but with
    the FFS frame shifted by `frame_delta` from where it *currently* sits
    (the [Nudge FFS Frame +/-1] control, PRD §6.1), not from a freshly
    auto-detected frame - the control is a stateful, repeatable nudge (click
    +1 twice, move two frames), so it must compose off the latest verdict's
    stored event_frame rather than recomputing detect_ffs_frame from
    scratch each time, which would make every nudge land on the same frame
    (auto_frame + frame_delta) regardless of how many times it was clicked.
    """
    frames, capture_metadata = repository.get_delivery_frames(delivery_id)
    latest_verdict = repository.get_latest_verdict_for_delivery(delivery_id)
    if latest_verdict is None:
        raise repository.NotFoundError(f"No prior verdict exists for delivery_id={delivery_id!r} to nudge.")

    filtered = _filtered_or_raw(frames, capture_metadata.fps)
    current_frame_number = latest_verdict.get("event_frame")
    if current_frame_number is None:
        # Only reachable for verdicts saved before event_frame existed
        # (pre-Milestone 5 data). Fall back to a fresh auto-detection.
        current_frame_number = detect_ffs_frame(filtered)

    nudged_frame_number = current_frame_number + frame_delta
    ffs_frame = next((f for f in filtered if f.frame == nudged_frame_number), None)
    if ffs_frame is None:
        raise ValueError(
            f"Nudged frame {nudged_frame_number} (current {current_frame_number} + {frame_delta}) "
            f"is out of range for this delivery's {len(filtered)} frames."
        )

    athlete_id = repository.get_athlete_id_for_delivery(delivery_id)
    return _score_and_persist(delivery_id, athlete_id, nudged_frame_number, ffs_frame)
