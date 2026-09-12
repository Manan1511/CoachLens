from fastapi import APIRouter, Depends, HTTPException

from src.coaching import repository
from src.coaching.auth import require_coach
from src.coaching.pipeline import ConsentRequiredError, UnknownBaselineError, evaluate_delivery, nudge_and_reevaluate
from src.measurement.errors import ThermalThrottleError
from src.coaching.export import format_whatsapp_card
from src.schemas.delivery import DeliveryIngestionRequest
from src.schemas.report import CoachingReport, WhatsAppExportResponse
from src.schemas.status import DeliveryStatus

router = APIRouter(prefix="/api/v1", tags=["deliveries"], dependencies=[Depends(require_coach)])


@router.post("/sessions/delivery", response_model=CoachingReport)
def ingest_delivery(payload: DeliveryIngestionRequest) -> CoachingReport:
    try:
        return evaluate_delivery(payload)
    except ThermalThrottleError as exc:
        raise HTTPException(status_code=422, detail={"code": exc.code, "message": str(exc)}) from exc
    except UnknownBaselineError as exc:
        raise HTTPException(status_code=422, detail={"code": "ERR_UNKNOWN_BASELINE", "message": str(exc)}) from exc
    except ConsentRequiredError as exc:
        raise HTTPException(status_code=403, detail={"code": "ERR_CONSENT_REQUIRED", "message": str(exc)}) from exc
    except repository.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/reports/{delivery_id}", response_model=CoachingReport)
def get_report(delivery_id: str) -> CoachingReport:
    report = repository.get_report(delivery_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"No report found for delivery_id={delivery_id!r}")
    return report


@router.get("/reports/{delivery_id}/export/whatsapp", response_model=WhatsAppExportResponse)
def export_whatsapp_card(delivery_id: str) -> WhatsAppExportResponse:
    """Exports a formatted WhatsApp-ready coaching card per PRD §10.3."""
    report = repository.get_report(delivery_id)
    if report is None:
        raise HTTPException(status_code=404, detail=f"No report found for delivery_id={delivery_id!r}")
    formatted_text = format_whatsapp_card(report)
    return WhatsAppExportResponse(
        delivery_id=report.delivery_id,
        report_id=report.report_id,
        status=report.verdict.status,
        formatted_text=formatted_text,
    )



@router.post("/deliveries/{delivery_id}/nudge-ffs", response_model=CoachingReport)
def nudge_ffs(delivery_id: str, frame_delta: int) -> CoachingReport:
    """[Nudge FFS Frame +/-1] coach control (PRD §6.1)."""
    try:
        return nudge_and_reevaluate(delivery_id, frame_delta)
    except repository.NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except UnknownBaselineError as exc:
        raise HTTPException(status_code=422, detail={"code": "ERR_UNKNOWN_BASELINE", "message": str(exc)}) from exc
    except ConsentRequiredError as exc:
        raise HTTPException(status_code=403, detail={"code": "ERR_CONSENT_REQUIRED", "message": str(exc)}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
