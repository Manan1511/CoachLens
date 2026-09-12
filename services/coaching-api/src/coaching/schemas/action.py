from typing import Literal

from pydantic import BaseModel


class CoachActionRequest(BaseModel):
    action: Literal["APPROVE", "DISMISS"]
    """NUDGE_FFS is handled by its own endpoint (POST .../nudge-ffs) since it
    re-evaluates the delivery rather than just recording a decision."""
    note: str | None = None


class BaselineConfirmRequest(BaseModel):
    metric: str
    median_deg: float
    iqr_deg: float
