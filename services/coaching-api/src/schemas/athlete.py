from datetime import date
from enum import StrEnum

from pydantic import BaseModel, Field


class BowlingArm(StrEnum):
    RIGHT = "RIGHT"
    LEFT = "LEFT"


class AthleteCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    bowling_arm: BowlingArm
    """Required at creation. The front (landing) leg is derived from it — a
    right-arm bowler lands on the left leg — and the capture app has no way
    to choose the correct limb from MediaPipe's left/right landmarks without
    it. It also decides which side the tripod belongs on, so the front leg
    is the near, unoccluded one. See MOBILE_PLAN.md §7."""
    dob: date | None = None
    """Optional, but its absence silently disables the PRD §10 consent gate
    for this athlete (see coaching/consent.py) — so a registration UI should
    press for it rather than treating it as throwaway."""
    guardian_consent: bool = False


class AthleteSummary(BaseModel):
    """A roster entry, as returned by GET /api/v1/athletes.

    Deliberately omits `dob`: the capture app reads this list on a phone
    shared net-side between players, and it needs to know whether an athlete
    can be recorded, not their birthday.
    """

    id: str
    name: str
    bowling_arm: BowlingArm | None = None
    """Null only for athletes created before this column existed (the demo
    seed row). A client must treat null as a setup error to fix in the
    dashboard, never guess a side — guessing produces a confidently wrong
    angle rather than a visible failure."""
    guardian_consent: bool
    consent_blocked: bool
    """True when deliveries for this athlete will be refused with 403
    ERR_CONSENT_REQUIRED. Lets a pool selector show them as unavailable up
    front instead of failing at the moment of recording, which is the worst
    possible time to discover it."""
