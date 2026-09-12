from pydantic import BaseModel, Field


class CaptureMetadata(BaseModel):
    fps: int
    pacing_jitter_pct: float
    shutter_speed_sec: float | None = None
    """Nullable because a capture client may have no way to read the actual
    exposure duration (e.g. react-native-vision-camera exposes only EV bias,
    not shutter speed - see MOBILE_PLAN.md §1/§3). None must mean "unknown",
    not a fabricated number: this is persisted verbatim as an audit record
    and never read by any backend decision (see measurement/audit.py, which
    deliberately measures pacing from frame timestamps rather than trusting
    self-reported metadata) - inventing a value here would misrepresent
    provenance without changing any outcome."""
    distance_meters: float
    tripod_height_meters: float
    camera_roll_deg: float


class Landmark(BaseModel):
    x: float
    y: float
    conf: float = Field(ge=0.0, le=1.0)


class KeypointFrame(BaseModel):
    frame: int
    t_ms: float
    knee: Landmark
    hip: Landmark
    ankle: Landmark
    shoulder: Landmark | None = None
    """Mid-shoulder point, needed for trunk-tilt at release. Optional because
    the PRD's §7.1 example payload omits it — treat frames without it as
    unusable for the trunk-tilt metric, not as malformed input."""
    wrist: Landmark | None = None
    """Added beyond the PRD's §7.1 example: release-frame detection ("arm
    extended overhead") needs a wrist point, which the original payload
    doesn't include. See BACKEND_PLAN.md's resolved-conflicts notes. Optional
    for the same reason as shoulder — frames without it can't be used for
    release detection, but aren't malformed."""


class DeliveryIngestionRequest(BaseModel):
    delivery_id: str
    session_id: str
    """The athlete for this delivery is resolved server-side from
    session_id -> sessions.athlete_id (see pipeline.evaluate_delivery), not
    accepted directly here - a client-supplied athlete_id could silently
    disagree with the session it's actually posted against (e.g. a coach
    quick-switching between bowlers in one nets recording session), scoring
    the delivery against the wrong athlete's baseline while persisting it
    under the right one. One source of truth avoids that split."""
    capture_metadata: CaptureMetadata
    raw_keypoints: list[KeypointFrame]
