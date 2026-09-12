from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from gotrue.errors import AuthApiError

from src.coaching import auth


@pytest.fixture
def mock_db(monkeypatch):
    db = MagicMock()
    monkeypatch.setattr(auth, "get_supabase", lambda: db)
    return db


def test_require_coach_raises_401_without_authorization_header():
    with pytest.raises(HTTPException) as exc_info:
        auth.require_coach(authorization=None)
    assert exc_info.value.status_code == 401


def test_require_coach_raises_401_on_malformed_header():
    with pytest.raises(HTTPException) as exc_info:
        auth.require_coach(authorization="not-a-bearer-token")
    assert exc_info.value.status_code == 401


def test_require_coach_raises_401_when_get_user_returns_none(mock_db):
    mock_db.auth.get_user.return_value = None
    with pytest.raises(HTTPException) as exc_info:
        auth.require_coach(authorization="Bearer some-token")
    assert exc_info.value.status_code == 401


def test_require_coach_raises_401_when_get_user_raises_auth_error(mock_db):
    mock_db.auth.get_user.side_effect = AuthApiError("invalid token", status=401, code="bad_jwt")
    with pytest.raises(HTTPException) as exc_info:
        auth.require_coach(authorization="Bearer bad-token")
    assert exc_info.value.status_code == 401


def test_require_coach_returns_coach_on_valid_token(mock_db):
    fake_user = MagicMock(id="coach-uuid-1", email="coach@example.com")
    mock_db.auth.get_user.return_value = MagicMock(user=fake_user)

    coach = auth.require_coach(authorization="Bearer good-token")

    assert coach.id == "coach-uuid-1"
    assert coach.email == "coach@example.com"
    mock_db.auth.get_user.assert_called_once_with("good-token")
