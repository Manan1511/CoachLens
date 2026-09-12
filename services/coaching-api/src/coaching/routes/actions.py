from fastapi import APIRouter, Depends, HTTPException

from src.coaching import repository
from src.coaching.auth import Coach, require_coach
from src.coaching.schemas.action import CoachActionRequest

router = APIRouter(prefix="/api/v1", tags=["coach-actions"])


@router.post("/deliveries/{delivery_id}/action")
def record_coach_action(
    delivery_id: str, payload: CoachActionRequest, coach: Coach = Depends(require_coach)
) -> dict:
    """[Approve Drill] / [Dismiss] coach controls (PRD §4 Layer 3). Records
    against the delivery's latest verdict - human-in-the-loop feedback is an
    audit-trail append, never a mutation of the verdict itself.
    """
    verdict_row = repository.get_latest_verdict_for_delivery(delivery_id)
    if verdict_row is None:
        raise HTTPException(status_code=404, detail=f"No verdict found for delivery_id={delivery_id!r}")

    repository.save_coach_action(
        verdict_id=verdict_row["id"],
        action=payload.action,
        note=payload.note,
        nudge_frame_delta=None,
        coach_id=coach.id,
    )
    return {"delivery_id": delivery_id, "verdict_id": verdict_row["id"], "action": payload.action, "coach_id": coach.id}
