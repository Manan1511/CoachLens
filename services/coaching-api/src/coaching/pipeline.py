"""Orchestrates measurement -> interpretation -> persistence for a delivery.
Supersedes the in-memory demo wiring used for Milestone 4's Swagger walkthrough
- that in-memory version is gone; this reads/writes real Supabase tables via
src/coaching/repository.py.
"""

from dataclasses import dataclass
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


@dataclass
class _Scored:
    """Everything needed to persist a verdict and build the CoachingReport,
    produced by a read-only decision pass (_score) that never writes
    anything and may raise. Keeping this separate from persistence is what
    lets evaluate_delivery avoid writing the delivery row until it already
    knows the whole evaluation will succeed - see _score's docstring.
    """

    kinematics: Kinematics
    verdict: Verdict
    baselines: Baselines
    drill_id: str | None
    trigger_deltas: list[float] | None


def _score(athlete_id: str, ffs_frame_number: int, ffs_frame: KeypointFrame, filtered: bool) -> _Scored:
    """Pure decision logic: quality firewall -> angle -> baseline lookup ->
    interpretation. Only reads from the repository (get_baseline,
    get_rolling_history_deltas) - never writes. May raise
    UnknownBaselineError.

    Kept separate from persistence specifically so evaluate_delivery can
    call this *before* writing the delivery row: if this raises, nothing
    has been persisted, avoiding an orphaned delivery with no verdict.
    """
    kinematics = Kinematics(ffs_frame=ffs_frame_number, filtered=filtered)

    if not passes_quality_firewall(ffs_frame):
        return _Scored(
            kinematics=kinematics,
            verdict=Verdict(
                status=DeliveryStatus.DATA_SUPPRESSED,
                window_pattern=WindowPattern.NOT_APPLICABLE,
                summary=_STATUS_SUMMARIES[DeliveryStatus.DATA_SUPPRESSED],
            ),
            baselines=Baselines(),
            drill_id=None,
            trigger_deltas=None,
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

    return _Scored(
        kinematics=kinematics,
        verdict=Verdict(
            status=deviation.status,
            window_pattern=deviation.window_pattern,
            window_matches=deviation.window_matches,
            trigger_context_deltas=deviation.trigger_deltas or None,
            summary=_STATUS_SUMMARIES[deviation.status],
        ),
        baselines=Baselines(
            fixed_reference_median_deg=baseline.median_deg,
            fixed_reference_iqr_deg=baseline.iqr_deg,
            delta_deg=deviation.delta_deg,
            uncertainty_band_deg=deviation.uncertainty_band_deg,
        ),
        drill_id=drill_id,
        trigger_deltas=deviation.trigger_deltas,
    )


def _persist_and_build_report(delivery_id: str, scored: _Scored) -> CoachingReport:
    """Writes the verdict row and assembles the response. Assumes the
    delivery row already exists (verdicts.delivery_id has a FK to
    deliveries) - callers are responsible for that (evaluate_delivery writes
    it just before calling this; nudge_and_reevaluate's delivery already
    exists by definition).
    """
    repository.save_verdict(
        delivery_id=delivery_id,
        metric=FRONT_KNEE_METRIC,
        status=scored.verdict.status,
        window_pattern=scored.verdict.window_pattern,
        window_matches=scored.verdict.window_matches,
        delta_deg=scored.baselines.delta_deg,
        uncertainty_band_deg=scored.baselines.uncertainty_band_deg,
        summary=scored.verdict.summary,
        drill_id=scored.drill_id,
        event_frame=scored.kinematics.ffs_frame,
        observed_value_deg=scored.kinematics.front_knee_angle_deg,
        confidence=scored.kinematics.front_knee_confidence,
        trigger_deltas=scored.trigger_deltas or None,
        filtered=scored.kinematics.filtered,
    )
    proposed_action = repository.get_drill(scored.drill_id) if scored.drill_id else None

    return CoachingReport(
        report_id=f"RPT-{delivery_id}",
        delivery_id=delivery_id,
        evaluation_timestamp=datetime.now(UTC),
        kinematics=scored.kinematics,
        baselines=scored.baselines,
        verdict=scored.verdict,
        proposed_action=proposed_action,
    )


def _filtered_or_raw(frames: list[KeypointFrame], fps: int) -> tuple[list[KeypointFrame], bool]:
    try:
        return butterworth_filter_frames(frames, fps=fps), True
    except ValueError:
        # Too few frames for a stable zero-phase filter. Proceeding
        # unfiltered rather than rejecting the delivery outright; real
        # ingestion clips should always have enough frames at 60-120fps.
        # The caller surfaces this via Kinematics.filtered=False rather than
        # silently returning a result indistinguishable from a filtered one.
        return frames, False


def evaluate_delivery(request: DeliveryIngestionRequest) -> CoachingReport:
    frames = request.raw_keypoints
    fps = request.capture_metadata.fps

    audit_frame_pacing(frames, fps=fps)
    filtered_frames, was_filtered = _filtered_or_raw(frames, fps)

    ffs_frame_number = detect_ffs_frame(filtered_frames)
    ffs_frame = next(f for f in filtered_frames if f.frame == ffs_frame_number)

    # Score before persisting anything: if the athlete has no baseline yet,
    # this raises UnknownBaselineError here, before the delivery row (or a
    # verdict, which has a hard FK dependency on it) is ever written -
    # avoiding an orphaned delivery with no verdict and a misleading 404 on
    # a later GET /reports/{id}.
    scored = _score(request.athlete_id, ffs_frame_number, ffs_frame, was_filtered)

    repository.save_delivery(request)
    return _persist_and_build_report(request.delivery_id, scored)


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

    filtered_frames, was_filtered = _filtered_or_raw(frames, capture_metadata.fps)
    current_frame_number = latest_verdict.get("event_frame")
    if current_frame_number is None:
        # Only reachable for verdicts saved before event_frame existed
        # (pre-Milestone 5 data). Fall back to a fresh auto-detection.
        current_frame_number = detect_ffs_frame(filtered_frames)

    nudged_frame_number = current_frame_number + frame_delta
    ffs_frame = next((f for f in filtered_frames if f.frame == nudged_frame_number), None)
    if ffs_frame is None:
        raise ValueError(
            f"Nudged frame {nudged_frame_number} (current {current_frame_number} + {frame_delta}) "
            f"is out of range for this delivery's {len(filtered_frames)} frames."
        )

    athlete_id = repository.get_athlete_id_for_delivery(delivery_id)
    scored = _score(athlete_id, nudged_frame_number, ffs_frame, was_filtered)
    return _persist_and_build_report(delivery_id, scored)
