"""Confirms auth is actually enforced on /api/v1 routes, not just that the
conftest override lets other tests bypass it. Clears the override for the
duration of this module - other test files rely on it being restored after.
"""

import pytest
from fastapi.testclient import TestClient

from src.coaching.auth import require_coach
from src.main import app


@pytest.fixture(autouse=True)
def no_auth_override():
    """Overrides conftest's autouse override for just this module, so these
    tests exercise the real require_coach dependency."""
    app.dependency_overrides.pop(require_coach, None)
    yield
    app.dependency_overrides.pop(require_coach, None)


client = TestClient(app)


def test_ingest_delivery_requires_auth():
    response = client.post("/api/v1/sessions/delivery", json={})
    assert response.status_code == 401


def test_get_report_requires_auth():
    response = client.get("/api/v1/reports/DEL-1")
    assert response.status_code == 401


def test_coach_action_requires_auth():
    response = client.post("/api/v1/deliveries/DEL-1/action", json={"action": "APPROVE"})
    assert response.status_code == 401


def test_confirm_baseline_requires_auth():
    response = client.post("/api/v1/athletes/ATH-1/baseline", json={})
    assert response.status_code == 401


def test_athlete_history_requires_auth():
    response = client.get("/api/v1/athletes/ATH-1/history")
    assert response.status_code == 401


def test_export_whatsapp_requires_auth():
    response = client.get("/api/v1/reports/DEL-1/export/whatsapp")
    assert response.status_code == 401


def test_nudge_ffs_requires_auth():
    response = client.post("/api/v1/deliveries/DEL-1/nudge-ffs?frame_delta=1")
    assert response.status_code == 401


def test_list_athletes_requires_auth():
    response = client.get("/api/v1/athletes")
    assert response.status_code == 401


def test_create_athlete_requires_auth():
    response = client.post("/api/v1/athletes", json={"name": "X", "bowling_arm": "RIGHT"})
    assert response.status_code == 401


def test_start_session_requires_auth():
    response = client.post("/api/v1/athletes/ATH-1/sessions")
    assert response.status_code == 401


def test_health_does_not_require_auth():
    response = client.get("/health")
    assert response.status_code == 200

