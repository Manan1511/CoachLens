"""Route tests monkeypatch pipeline/repository functions as bound into the
route modules' own namespaces (they do `from src.coaching.pipeline import
evaluate_delivery`, so the name must be patched on
src.coaching.routes.deliveries, not on src.coaching.pipeline itself).
"""

from fastapi.testclient import TestClient

from src.coaching import repository
from src.coaching.routes import actions, athletes, deliveries
from src.main import app
from src.measurement.errors import ThermalThrottleError
from src.schemas.delivery import CaptureMetadata, DeliveryIngestionRequest, KeypointFrame, Landmark
from src.schemas.report import Baselines, CoachingReport, Kinematics, Verdict
from src.schemas.status import DeliveryStatus, WindowPattern

client = TestClient(app)


def make_payload(delivery_id: str = "DEL-1") -> dict:
    dt = 1000.0 / 120
    return {
        "delivery_id": delivery_id,
        "session_id": "SES-1",
        "athlete_id": "ATH-1",
        "capture_metadata": {
            "fps": 120, "pacing_jitter_pct": 2.1, "shutter_speed_sec": 0.001,
            "distance_meters": 3.0, "tripod_height_meters": 1.1, "camera_roll_deg": 1.2,
        },
        "raw_keypoints": [
            {
                "frame": i, "t_ms": i * dt,
                "knee": {"x": 800, "y": 1400, "conf": 0.95},
                "hip": {"x": 820, "y": 1040, "conf": 0.96},
                "ankle": {"x": 900, "y": 1000, "conf": 0.92},
            }
            for i in range(5)
        ],
    }


def make_report(delivery_id="DEL-1", status=DeliveryStatus.FORM_BENCHMARK) -> CoachingReport:
    return CoachingReport(
        report_id=f"RPT-{delivery_id}",
        delivery_id=delivery_id,
        evaluation_timestamp="2026-09-12T10:15:32Z",
        kinematics=Kinematics(ffs_frame=20, front_knee_angle_deg=147.0, front_knee_confidence=0.95),
        baselines=Baselines(fixed_reference_median_deg=148.0, fixed_reference_iqr_deg=3.5, delta_deg=-1.0),
        verdict=Verdict(status=status, window_pattern=WindowPattern.NOT_APPLICABLE, summary="ok"),
    )


def test_ingest_delivery_returns_pipeline_result(monkeypatch):
    expected = make_report()
    monkeypatch.setattr(deliveries, "evaluate_delivery", lambda payload: expected)
    response = client.post("/api/v1/sessions/delivery", json=make_payload())
    assert response.status_code == 200
    assert response.json()["delivery_id"] == "DEL-1"


def test_ingest_delivery_maps_thermal_throttle_to_422(monkeypatch):
    def raise_throttle(payload):
        raise ThermalThrottleError(15.0, 8.0)

    monkeypatch.setattr(deliveries, "evaluate_delivery", raise_throttle)
    response = client.post("/api/v1/sessions/delivery", json=make_payload())
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ERR_THERMAL_THROTTLE"


def test_get_report_404_when_not_found(monkeypatch):
    monkeypatch.setattr(repository, "get_report", lambda delivery_id: None)
    response = client.get("/api/v1/reports/DOES-NOT-EXIST")
    assert response.status_code == 404


def test_get_report_returns_reconstructed_report(monkeypatch):
    expected = make_report()
    monkeypatch.setattr(repository, "get_report", lambda delivery_id: expected)
    response = client.get("/api/v1/reports/DEL-1")
    assert response.status_code == 200
    assert response.json()["verdict"]["status"] == "FORM_BENCHMARK"


def test_nudge_ffs_returns_updated_report(monkeypatch):
    expected = make_report(status=DeliveryStatus.TECHNICAL_CONCERN)
    monkeypatch.setattr(deliveries, "nudge_and_reevaluate", lambda delivery_id, frame_delta: expected)
    response = client.post("/api/v1/deliveries/DEL-1/nudge-ffs", params={"frame_delta": 1})
    assert response.status_code == 200
    assert response.json()["verdict"]["status"] == "TECHNICAL_CONCERN"


def test_nudge_ffs_404_on_not_found(monkeypatch):
    def raise_not_found(delivery_id, frame_delta):
        raise repository.NotFoundError("no such delivery")

    monkeypatch.setattr(deliveries, "nudge_and_reevaluate", raise_not_found)
    response = client.post("/api/v1/deliveries/DEL-MISSING/nudge-ffs", params={"frame_delta": 1})
    assert response.status_code == 404


def test_record_coach_action_saves_against_latest_verdict(monkeypatch):
    saved = {}
    monkeypatch.setattr(actions.repository, "get_latest_verdict_for_delivery", lambda delivery_id: {"id": "verdict-1"})
    monkeypatch.setattr(
        actions.repository,
        "save_coach_action",
        lambda verdict_id, action, note, nudge_frame_delta: saved.update(
            verdict_id=verdict_id, action=action, note=note
        ),
    )
    response = client.post("/api/v1/deliveries/DEL-1/action", json={"action": "APPROVE", "note": "looks good"})
    assert response.status_code == 200
    assert saved == {"verdict_id": "verdict-1", "action": "APPROVE", "note": "looks good"}


def test_record_coach_action_404_when_no_verdict(monkeypatch):
    monkeypatch.setattr(actions.repository, "get_latest_verdict_for_delivery", lambda delivery_id: None)
    response = client.post("/api/v1/deliveries/DEL-1/action", json={"action": "DISMISS"})
    assert response.status_code == 404


def test_confirm_baseline_calls_repository(monkeypatch):
    saved = {}
    monkeypatch.setattr(
        athletes.repository,
        "confirm_baseline",
        lambda athlete_id, metric, median_deg, iqr_deg: saved.update(
            athlete_id=athlete_id, metric=metric, median_deg=median_deg, iqr_deg=iqr_deg
        ),
    )
    response = client.post(
        "/api/v1/athletes/ATH-1/baseline",
        json={"metric": "front_knee_angle_deg", "median_deg": 148.0, "iqr_deg": 3.5},
    )
    assert response.status_code == 200
    assert saved["athlete_id"] == "ATH-1"
    assert saved["median_deg"] == 148.0


def test_get_athlete_history_returns_repository_data(monkeypatch):
    monkeypatch.setattr(athletes.repository, "get_athlete_history", lambda athlete_id: [{"id": "SES-1"}])
    response = client.get("/api/v1/athletes/ATH-1/history")
    assert response.status_code == 200
    assert response.json() == [{"id": "SES-1"}]
