from pydantic import BaseModel, Field


class CaptureMetadata(BaseModel):
    fps: int
    pacing_jitter_pct: float
    shutter_speed_sec: float
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


class DeliveryIngestionRequest(BaseModel):
    delivery_id: str
    session_id: str
    athlete_id: str
    capture_metadata: CaptureMetadata
    raw_keypoints: list[KeypointFrame]
