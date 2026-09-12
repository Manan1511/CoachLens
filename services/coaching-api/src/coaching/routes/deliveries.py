from fastapi import APIRouter

from src.schemas.delivery import DeliveryIngestionRequest
from src.schemas.report import CoachingReport

router = APIRouter(prefix="/api/v1", tags=["deliveries"])


@router.post("/sessions/delivery", response_model=CoachingReport)
def ingest_delivery(payload: DeliveryIngestionRequest) -> CoachingReport:
    """Placeholder wiring for Milestone 1 (contracts only). The actual
    measurement/interpretation/coaching pipeline is built in Milestones 3-5;
    this exists so the OpenAPI spec reflects the real request/response shapes."""
    raise NotImplementedError


@router.get("/reports/{delivery_id}", response_model=CoachingReport)
def get_report(delivery_id: str) -> CoachingReport:
    raise NotImplementedError
