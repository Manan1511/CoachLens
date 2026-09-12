from datetime import date

from pydantic import BaseModel


class SessionResponse(BaseModel):
    session_id: str
    athlete_id: str
    session_date: date
    created: bool
    """False when an existing session for this athlete+date was reused
    rather than a new one created - lets a client tell "quick-switched back
    to a player already recorded today" apart from "first delivery of a new
    session" without a second lookup."""
