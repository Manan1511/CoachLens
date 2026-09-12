"""The consent predicate is shared by the ingestion path (pipeline.
_check_consent) and the athlete roster (repository.list_athletes), so it's
tested directly here rather than only through those two callers - a drift
between them is exactly what extracting it was meant to prevent.

`today` is passed explicitly throughout: a test that computes ages against
date.today() would change behaviour depending on when it runs, and the
birthday-boundary cases below are the ones most likely to break silently.
"""

from datetime import date

from src.coaching.consent import MINOR_AGE_CUTOFF, age_in_years, is_consent_blocked

TODAY = date(2026, 9, 12)


def test_age_in_years_before_birthday_this_year():
    assert age_in_years(date(2008, 9, 13), today=TODAY) == 17


def test_age_in_years_on_birthday():
    assert age_in_years(date(2008, 9, 12), today=TODAY) == 18


def test_minor_without_consent_is_blocked():
    assert is_consent_blocked(date(2012, 1, 1), guardian_consent=False, today=TODAY) is True


def test_minor_with_consent_is_not_blocked():
    assert is_consent_blocked(date(2012, 1, 1), guardian_consent=True, today=TODAY) is False


def test_adult_without_consent_is_not_blocked():
    assert is_consent_blocked(date(1995, 1, 1), guardian_consent=False, today=TODAY) is False


def test_athlete_turning_18_today_is_not_blocked():
    """Boundary: the cutoff is "under 18", so an 18th birthday clears the gate."""
    dob = date(TODAY.year - MINOR_AGE_CUTOFF, TODAY.month, TODAY.day)
    assert is_consent_blocked(dob, guardian_consent=False, today=TODAY) is False


def test_athlete_one_day_short_of_18_is_blocked():
    dob = date(TODAY.year - MINOR_AGE_CUTOFF, TODAY.month, TODAY.day + 1)
    assert is_consent_blocked(dob, guardian_consent=False, today=TODAY) is True


def test_missing_dob_does_not_block():
    """Documented limitation, not an oversight: minor status is
    undeterminable without a dob, and defaulting to blocked would lock out
    adults whose dob was never recorded. See consent.is_consent_blocked."""
    assert is_consent_blocked(None, guardian_consent=False, today=TODAY) is False
