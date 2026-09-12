from fastapi import APIRouter

from src.coaching import repository
from src.coaching.schemas.action import BaselineConfirmRequest

router = APIRouter(prefix="/api/v1/athletes", tags=["athletes"])


@router.post("/{athlete_id}/baseline")
def confirm_baseline(athlete_id: str, payload: BaselineConfirmRequest) -> dict:
    """Coach-confirmed Fixed Reference Baseline (PRD §4 Layer 2: median + IQR
    across 8-10 un-fatigued benchmark deliveries). This endpoint just stores
    the confirmed numbers - computing them from a batch of deliveries is a
    coach/UI workflow step, not something this endpoint does itself.
    """
    repository.confirm_baseline(athlete_id, payload.metric, payload.median_deg, payload.iqr_deg)
    return {"athlete_id": athlete_id, "metric": payload.metric, "confirmed": True}


@router.get("/{athlete_id}/history")
def get_athlete_history(athlete_id: str) -> list[dict]:
    return repository.get_athlete_history(athlete_id)
