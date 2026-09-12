"""Shared pytest fixtures. Route tests exercise real endpoints via
TestClient, and every /api/v1 route now requires an authenticated coach
(Milestone 7) - overriding the require_coach dependency here means existing
route tests don't need to construct real Supabase Auth JWTs. Tests that
specifically want to verify auth enforcement clear the override themselves.
"""

import pytest

from src.coaching.auth import Coach, require_coach
from src.main import app

TEST_COACH = Coach(id="00000000-0000-0000-0000-000000000001", email="coach@test.dev")


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[require_coach] = lambda: TEST_COACH
    yield
    app.dependency_overrides.pop(require_coach, None)
