from fastapi import APIRouter, Depends, HTTPException

from src.coaching import repository
from src.coaching.auth import Coach, require_coach
from src.coaching.schemas.action import BaselineConfirmRequest
from src.schemas.athlete import AthleteCreateRequest, AthleteSummary
from src.schemas.session import SessionResponse

router = APIRouter(prefix="/api/v1/athletes", tags=["athletes"])


@router.get("", response_model=list[AthleteSummary])
def list_athletes(coach: Coach = Depends(require_coach)) -> list[AthleteSummary]:
    """The roster the capture app draws its session pool from. Returns every
    athlete — `athletes` has no per-coach ownership column yet (see
    repository.list_athletes)."""
    return repository.list_athletes()


@router.post("", response_model=AthleteSummary, status_code=201)
def create_athlete(payload: AthleteCreateRequest, coach: Coach = Depends(require_coach)) -> AthleteSummary:
    """Player registration, consumed by the coach dashboard — not by the
    capture app, which only ever reads the roster (MOBILE_PLAN.md §2).
    `bowling_arm` is required here precisely so the capture app never has to
    guess which leg is the front leg.
    """
    return repository.create_athlete(
        name=payload.name,
        bowling_arm=payload.bowling_arm.value,
        dob=payload.dob,
        guardian_consent=payload.guardian_consent,
    )


@router.post("/{athlete_id}/sessions", response_model=SessionResponse)
def start_or_resume_session(athlete_id: str, coach: Coach = Depends(require_coach)) -> SessionResponse:
    """Get-or-create today's session for this athlete (PRD nets workflow:
    one coach/one phone, multiple bowlers taking turns - the mobile app
    calls this on every "which bowler is up" switch, and gets back the same
    session_id all day for a player it's already recorded).
    """
    try:
        session_id, session_date, created = repository.get_or_create_session(athlete_id)
    except repository.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return SessionResponse(session_id=session_id, athlete_id=athlete_id, session_date=session_date, created=created)


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
