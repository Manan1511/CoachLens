"""PRD §10 adolescent consent gate, kept in one place so the ingestion path
(pipeline._check_consent) and the athlete roster (which shows whether a
player can be recorded at all) can't drift on who counts as blocked.
"""

from datetime import date

MINOR_AGE_CUTOFF = 18


def age_in_years(dob: date, today: date | None = None) -> int:
    reference = today or date.today()
    return reference.year - dob.year - ((reference.month, reference.day) < (dob.month, dob.day))


def is_consent_blocked(dob: date | None, guardian_consent: bool, today: date | None = None) -> bool:
    """True when this athlete's deliveries must be refused for want of
    guardian consent.

    `dob is None` returns False: minor status can't be determined, and
    defaulting to blocked would lock out adults whose dob was simply never
    recorded (the pre-Milestone-7 seed/demo data, for one). That's a real
    enforcement gap, documented in BACKEND_PLAN.md Milestone 7 — a
    data-completeness problem to fix at registration, not something this
    predicate can safely assume its way out of.
    """
    if dob is None:
        return False
    return age_in_years(dob, today) < MINOR_AGE_CUTOFF and not guardian_consent
