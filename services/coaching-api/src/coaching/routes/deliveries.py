from fastapi import APIRouter, HTTPException

from src.coaching.pipeline import UnknownBaselineError, evaluate_delivery
from src.measurement.errors import ThermalThrottleError
from src.schemas.delivery import DeliveryIngestionRequest
from src.schemas.report import CoachingReport

router = APIRouter(prefix="/api/v1", tags=["deliveries"])

# Temporary in-memory report store, standing in for Supabase persistence
# until Milestone 5. Process-local; resets on restart.
_REPORTS: dict[str, CoachingReport] = {}


@router.post("/sessions/delivery", response_model=CoachingReport)
def ingest_delivery(payload: DeliveryIngestionRequest) -> CoachingReport:
    try:
        report = evaluate_delivery(payload)
    except ThermalThrottleError as exc:
        raise HTTPException(status_code=422, detail={"code": exc.code, "message": str(exc)}) from exc
    except UnknownBaselineError as exc:
        raise HTTPException(status_code=422, detail={"code": "ERR_UNKNOWN_BASELINE", "message": str(exc)}) from exc

    _REPORTS[report.delivery_id] = report
    return report


@router.get("/reports/{delivery_id}", response_model=CoachingReport)
def get_report(delivery_id: str) -> CoachingReport:
    report = _REPORTS.get(delivery_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"No report found for delivery_id={delivery_id!r}")
    return report
