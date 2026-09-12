from fastapi import FastAPI

from src.coaching.routes.actions import router as actions_router
from src.coaching.routes.athletes import router as athletes_router
from src.coaching.routes.deliveries import router as deliveries_router

app = FastAPI(title="CoachLens Coaching API")
app.include_router(deliveries_router)
app.include_router(actions_router)
app.include_router(athletes_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
