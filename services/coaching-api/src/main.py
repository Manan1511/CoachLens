from fastapi import FastAPI

from src.coaching.routes.deliveries import router as deliveries_router

app = FastAPI(title="CoachLens Coaching API")
app.include_router(deliveries_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
