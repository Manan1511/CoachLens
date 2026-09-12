"""Supabase-backed persistence for the coaching layer. Kept as plain
functions (not a class) so each can be mocked independently in tests via
`unittest.mock` against the `get_supabase()` chain, without needing a fake
Postgres or real network access.
"""

from dataclasses import dataclass
from datetime import datetime

from src.db.client import get_supabase
from src.schemas.delivery import CaptureMetadata, DeliveryIngestionRequest, KeypointFrame
from src.schemas.report import Baselines, CoachingReport, Kinematics, ProposedAction, Verdict
from src.schemas.status import DeliveryStatus, WindowPattern

ROLLING_HISTORY_LIMIT = 4


@dataclass
class BaselineRecord:
    median_deg: float
    iqr_deg: float


class NotFoundError(Exception):
    """Raised when a referenced row (athlete, baseline, delivery) doesn't exist."""


def get_baseline(athlete_id: str, metric: str) -> BaselineRecord | None:
    db = get_supabase()
    result = (
        db.table("baselines")
        .select("fixed_median_deg, fixed_iqr_deg")
        .eq("athlete_id", athlete_id)
        .eq("metric", metric)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    row = result.data[0]
    return BaselineRecord(median_deg=row["fixed_median_deg"], iqr_deg=row["fixed_iqr_deg"])


def confirm_baseline(athlete_id: str, metric: str, median_deg: float, iqr_deg: float) -> None:
    db = get_supabase()
    db.table("baselines").upsert(
        {
            "athlete_id": athlete_id,
            "metric": metric,
            "fixed_median_deg": median_deg,
            "fixed_iqr_deg": iqr_deg,
        }
    ).execute()


def get_rolling_history_deltas(athlete_id: str, metric: str, limit: int = ROLLING_HISTORY_LIMIT) -> list[float]:
    """Deltas from the last `limit` verdicts for this athlete+metric, oldest
    first (evaluate_delivery_deviation expects oldest-first ordering).

    Done as three simple queries (sessions -> deliveries -> verdicts) rather
    than one query filtering through PostgREST's embedded-resource dot
    syntax (e.g. `deliveries.sessions.athlete_id`) - that syntax exists, but
    with RLS locked to deny-by-default (see the enable_rls_default_deny
    migration), there's no way to verify it against the real API from this
    environment without the service_role key. Three calls using only
    eq/in_/order/limit is slower but each step is unambiguous.
    """
    db = get_supabase()

    session_rows = db.table("sessions").select("id").eq("athlete_id", athlete_id).execute()
    session_ids = [row["id"] for row in session_rows.data]
    if not session_ids:
        return []

    delivery_rows = db.table("deliveries").select("id").in_("session_id", session_ids).execute()
    delivery_ids = [row["id"] for row in delivery_rows.data]
    if not delivery_ids:
        return []

    verdict_rows = (
        db.table("verdicts")
        .select("delta_deg")
        .in_("delivery_id", delivery_ids)
        .eq("metric", metric)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    deltas = [row["delta_deg"] for row in reversed(verdict_rows.data) if row["delta_deg"] is not None]
    return deltas


def save_delivery(request: DeliveryIngestionRequest) -> None:
    db = get_supabase()
    db.table("deliveries").upsert(
        {
            "id": request.delivery_id,
            "session_id": request.session_id,
            "raw_keypoints": [f.model_dump(mode="json") for f in request.raw_keypoints],
            "capture_metadata": request.capture_metadata.model_dump(mode="json"),
        }
    ).execute()


def get_delivery_frames(delivery_id: str) -> tuple[list[KeypointFrame], CaptureMetadata]:
    db = get_supabase()
    result = (
        db.table("deliveries")
        .select("raw_keypoints, capture_metadata")
        .eq("id", delivery_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise NotFoundError(f"No delivery found for delivery_id={delivery_id!r}")
    row = result.data[0]
    frames = [KeypointFrame.model_validate(f) for f in row["raw_keypoints"]]
    metadata = CaptureMetadata.model_validate(row["capture_metadata"])
    return frames, metadata


def save_verdict(
    delivery_id: str,
    metric: str,
    status: DeliveryStatus,
    window_pattern: WindowPattern,
    window_matches: int,
    delta_deg: float | None,
    uncertainty_band_deg: float | None,
    summary: str,
    drill_id: str | None,
    event_frame: int | None = None,
    observed_value_deg: float | None = None,
    confidence: float | None = None,
    trigger_deltas: list[float] | None = None,
) -> str:
    """Verdicts are immutable historical records (PRD Layer 3 audit trail),
    so the observed kinematics that produced this verdict (event_frame,
    observed_value_deg, confidence) are persisted alongside it - a later
    GET /reports/{id} reconstructs the report from these stored values
    rather than recomputing from raw_keypoints, which could silently drift
    if the algorithm changes after the fact.
    """
    db = get_supabase()
    result = (
        db.table("verdicts")
        .insert(
            {
                "delivery_id": delivery_id,
                "metric": metric,
                "status": status.value,
                "window_pattern": window_pattern.value,
                "window_matches": window_matches,
                "delta_deg": delta_deg,
                "uncertainty_band_deg": uncertainty_band_deg,
                "summary": summary,
                "drill_id": drill_id,
                "event_frame": event_frame,
                "observed_value_deg": observed_value_deg,
                "confidence": confidence,
                "trigger_deltas": trigger_deltas,
            }
        )
        .execute()
    )
    return result.data[0]["id"]


def get_drill(drill_id: str) -> ProposedAction | None:
    db = get_supabase()
    result = db.table("drills").select("*").eq("id", drill_id).limit(1).execute()
    if not result.data:
        return None
    row = result.data[0]
    return ProposedAction(
        drill_id=row["id"],
        title=row["title"],
        prescription=row["prescription"],
        contraindications=row["contraindications"],
        credential=row["credential"],
    )


def save_coach_action(verdict_id: str, action: str, note: str | None, nudge_frame_delta: int | None) -> None:
    db = get_supabase()
    db.table("coach_actions").insert(
        {
            "verdict_id": verdict_id,
            "action": action,
            "note": note,
            "nudge_frame_delta": nudge_frame_delta,
        }
    ).execute()


def get_athlete_id_for_delivery(delivery_id: str) -> str:
    """deliveries doesn't carry athlete_id directly (see schema) - go
    through session_id -> sessions.athlete_id."""
    db = get_supabase()
    delivery_rows = db.table("deliveries").select("session_id").eq("id", delivery_id).limit(1).execute()
    if not delivery_rows.data:
        raise NotFoundError(f"No delivery found for delivery_id={delivery_id!r}")
    session_id = delivery_rows.data[0]["session_id"]

    session_rows = db.table("sessions").select("athlete_id").eq("id", session_id).limit(1).execute()
    if not session_rows.data:
        raise NotFoundError(f"No session found for session_id={session_id!r}")
    return session_rows.data[0]["athlete_id"]


def get_latest_verdict_for_delivery(delivery_id: str) -> dict | None:
    db = get_supabase()
    result = (
        db.table("verdicts")
        .select("*")
        .eq("delivery_id", delivery_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_report(delivery_id: str) -> CoachingReport | None:
    """Reconstructs a CoachingReport purely from persisted rows (verdicts +
    baselines + drills), for GET /reports/{delivery_id}. Returns the report
    for the *latest* verdict on this delivery (e.g. after a Nudge FFS
    re-evaluation), not the original one, matching the coach-facing "current
    state of this delivery" semantics rather than a full audit history (that
    belongs to get_athlete_history / a future audit endpoint).
    """
    verdict_row = get_latest_verdict_for_delivery(delivery_id)
    if verdict_row is None:
        return None

    status = DeliveryStatus(verdict_row["status"])
    window_pattern = WindowPattern(verdict_row["window_pattern"])

    kinematics = Kinematics(
        ffs_frame=verdict_row["event_frame"],
        front_knee_angle_deg=verdict_row["observed_value_deg"],
        front_knee_confidence=verdict_row["confidence"],
    )

    baselines = Baselines()
    if status != DeliveryStatus.DATA_SUPPRESSED:
        athlete_id = get_athlete_id_for_delivery(delivery_id)
        baseline = get_baseline(athlete_id, verdict_row["metric"])
        if baseline is not None:
            baselines = Baselines(
                fixed_reference_median_deg=baseline.median_deg,
                fixed_reference_iqr_deg=baseline.iqr_deg,
                delta_deg=verdict_row["delta_deg"],
                uncertainty_band_deg=verdict_row["uncertainty_band_deg"],
            )

    proposed_action = get_drill(verdict_row["drill_id"]) if verdict_row["drill_id"] else None

    return CoachingReport(
        report_id=f"RPT-{delivery_id}",
        delivery_id=delivery_id,
        evaluation_timestamp=datetime.fromisoformat(verdict_row["created_at"]),
        kinematics=kinematics,
        baselines=baselines,
        verdict=Verdict(
            status=status,
            window_pattern=window_pattern,
            trigger_context_deltas=verdict_row.get("trigger_deltas"),
            window_matches=verdict_row["window_matches"],
            summary=verdict_row["summary"],
        ),
        proposed_action=proposed_action,
    )


def get_athlete_history(athlete_id: str) -> list[dict]:
    """Sessions -> deliveries -> latest verdict, most recent session first.

    Uses PostgREST's nested-embed select (well-documented, arbitrary depth),
    unlike get_rolling_history_deltas' filter-by-embedded-column, which is
    riskier and was avoided there. This is still worth a real smoke test
    once SUPABASE_SERVICE_ROLE_KEY is available locally - flagging rather
    than asserting it's correct.
    """
    db = get_supabase()
    result = (
        db.table("sessions")
        .select("id, session_date, deliveries(id, created_at, verdicts(status, delta_deg, created_at))")
        .eq("athlete_id", athlete_id)
        .order("session_date", desc=True)
        .execute()
    )
    return result.data
