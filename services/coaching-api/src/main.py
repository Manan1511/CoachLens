from fastapi import FastAPI

app = FastAPI(title="CoachLens Coaching API")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
