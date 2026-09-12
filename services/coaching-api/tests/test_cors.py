from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)

SAMPLE_ORIGIN = "https://app.coachlens.dev"


def test_cors_headers_on_health_check() -> None:
    response = client.get("/health", headers={"Origin": SAMPLE_ORIGIN})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "*"


def test_cors_preflight_options() -> None:
    response = client.options(
        "/api/v1/sessions/delivery",
        headers={
            "Origin": SAMPLE_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == SAMPLE_ORIGIN
    assert response.headers.get("access-control-allow-credentials") == "true"
    assert "POST" in response.headers.get("access-control-allow-methods", "")

