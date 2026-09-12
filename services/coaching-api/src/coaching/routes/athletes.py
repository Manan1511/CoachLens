from fastapi import APIRouter, Depends

from src.coaching import repository
from src.coaching.auth import Coach, require_coach
from src.coaching.schemas.action import BaselineConfirmRequest

router = APIRouter(prefix="/api/v1/athletes", tags=["athletes"])


@router.post("/{athlete_id}/baseline")
def confirm_baseline(athlete_id: str, payload: BaselineConfirmRequest, coach: Coach = Depends(require_coach)) -> dict:
    """Coach-confirmed Fixed Reference Baseline (PRD §4 Layer 2: median + IQR
    across 8-10 un-fatigued benchmark deliveries). This endpoint just stores
    the confirmed numbers - computing them from a batch of deliveries is a
    coach/UI workflow step, not something this endpoint does itself.
    """
    repository.confirm_baseline(athlete_id, payload.metric, payload.median_deg, payload.iqr_deg, confirmed_by=coach.id)
    return {"athlete_id": athlete_id, "metric": payload.metric, "confirmed": True, "confirmed_by": coach.id}


@router.get("/{athlete_id}/history")
def get_athlete_history(athlete_id: str, coach: Coach = Depends(require_coach)) -> list[dict]:
    return repository.get_athlete_history(athlete_id)
