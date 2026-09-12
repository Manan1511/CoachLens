from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def make_payload(delivery_id: str, knee_x_at_plant: float, fps: int = 120) -> dict:
    dt = 1000.0 / fps
    n = 30
    plant_index = 20
    frames = []
    for i in range(n):
        if i < plant_index:
            y = 800.0 + (i / plant_index) * 200.0
            x = 700.0 + i * 5.0
        else:
            y = 1000.0
            x = knee_x_at_plant
        frames.append(
            {
                "frame": i,
                "t_ms": i * dt,
                "knee": {"x": 800, "y": 1400, "conf": 0.95},
                "hip": {"x": 820, "y": 1040, "conf": 0.96},
                "ankle": {"x": x, "y": y, "conf": 0.92},
            }
        )
    return {
        "delivery_id": delivery_id,
        "session_id": "SES-TEST",
        "athlete_id": "ATH-DEMO-01",
        "capture_metadata": {
            "fps": fps,
            "pacing_jitter_pct": 2.1,
            "shutter_speed_sec": 0.001,
            "distance_meters": 3.0,
            "tripod_height_meters": 1.1,
            "camera_roll_deg": 1.2,
        },
        "raw_keypoints": frames,
    }


def test_ingest_and_fetch_report_round_trip():
    payload = make_payload("DEL-ROUTE-TEST-01", knee_x_at_plant=900.0)
    response = client.post("/api/v1/sessions/delivery", json=payload)
    assert response.status_code == 200
    report = response.json()
    assert report["delivery_id"] == "DEL-ROUTE-TEST-01"
    assert report["verdict"]["status"] in {
        "FORM_BENCHMARK",
        "MECHANICAL_WATCH",
        "TECHNICAL_CONCERN",
        "DATA_SUPPRESSED",
    }

    fetched = client.get(f"/api/v1/reports/{report['delivery_id']}")
    assert fetched.status_code == 200
    assert fetched.json() == report


def test_get_report_404_for_unknown_delivery():
    response = client.get("/api/v1/reports/DOES-NOT-EXIST")
    assert response.status_code == 404


def test_unknown_athlete_baseline_returns_422():
    payload = make_payload("DEL-ROUTE-TEST-02", knee_x_at_plant=900.0)
    payload["athlete_id"] = "ATH-NOBODY"
    response = client.post("/api/v1/sessions/delivery", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ERR_UNKNOWN_BASELINE"


def test_thermal_throttle_returns_422():
    payload = make_payload("DEL-ROUTE-TEST-03", knee_x_at_plant=900.0)
    # Inject a large timing gap to simulate dropped frames.
    payload["raw_keypoints"][5]["t_ms"] = payload["raw_keypoints"][4]["t_ms"] + 100
    response = client.post("/api/v1/sessions/delivery", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ERR_THERMAL_THROTTLE"
