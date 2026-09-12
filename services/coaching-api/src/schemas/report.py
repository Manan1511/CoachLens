from datetime import datetime

from pydantic import BaseModel

from src.schemas.status import DeliveryStatus, WindowPattern


class Kinematics(BaseModel):
    ffs_frame: int | None = None
    front_knee_angle_deg: float | None = None
    front_knee_confidence: float | None = None
    forward_trunk_tilt_deg: float | None = None
    trunk_tilt_confidence: float | None = None


class Baselines(BaseModel):
    fixed_reference_median_deg: float | None = None
    fixed_reference_iqr_deg: float | None = None
    rolling_6wk_median_deg: float | None = None
    """Deferred per BACKEND_PLAN.md — no session has 6 weeks of history yet,
    so this stays null until Milestone 4's rolling-baseline work lands."""
    delta_deg: float | None = None
    uncertainty_band_deg: float | None = None


class Verdict(BaseModel):
    status: DeliveryStatus
    window_pattern: WindowPattern
    window_matches: int = 0
    trigger_context_deltas: list[float] | None = None
    """The prior deltas that contributed to this verdict's window count -
    the data behind PRD §5's "Why was this flagged?" transparency card.
    None for FORM_BENCHMARK/DATA_SUPPRESSED, where no window was evaluated."""
    summary: str
    clinical_disclaimer: str = (
        "Non-diagnostic coaching metric. Reported athlete pain strictly voids prompts."
    )


class ProposedAction(BaseModel):
    drill_id: str
    title: str
    prescription: str
    contraindications: list[str]
    credential: str


class CoachingReport(BaseModel):
    report_id: str
    delivery_id: str
    evaluation_timestamp: datetime
    kinematics: Kinematics
    baselines: Baselines
    verdict: Verdict
    proposed_action: ProposedAction | None = None
    """Only populated when verdict.status == TECHNICAL_CONCERN."""
