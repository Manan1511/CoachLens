from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.coaching.routes.actions import router as actions_router
from src.coaching.routes.athletes import router as athletes_router
from src.coaching.routes.deliveries import router as deliveries_router
from src.settings import settings

app = FastAPI(title="CoachLens Coaching API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(deliveries_router)
app.include_router(actions_router)
app.include_router(athletes_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

