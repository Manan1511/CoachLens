"""Pipeline tests monkeypatch the `repository` module directly (imported in
pipeline.py as `from src.coaching import repository`, so patching attributes
on that module object affects pipeline's calls too) - this tests the actual
orchestration logic without a real database.
"""

import pytest

from src.coaching import pipeline, repository
from src.schemas.delivery import CaptureMetadata, DeliveryIngestionRequest, KeypointFrame, Landmark
from src.schemas.status import DeliveryStatus

FPS = 120


def make_frames(ankle_conf: float = 0.92, knee_conf: float = 0.95, hip_conf: float = 0.96) -> list[KeypointFrame]:
    dt = 1000.0 / FPS
    n = 30
    plant = 20
    frames = []
    for i in range(n):
        if i < plant:
            y = 800.0 + (i / plant) * 200.0
            x = 700.0 + i * 5.0
        else:
            y = 1000.0
            x = 900.0
        frames.append(
            KeypointFrame(
                frame=i,
                t_ms=i * dt,
                knee=Landmark(x=800, y=1400, conf=knee_conf),
                hip=Landmark(x=820, y=1040, conf=hip_conf),
                ankle=Landmark(x=x, y=y, conf=ankle_conf),
            )
        )
    return frames


def make_request(delivery_id="DEL-1", athlete_id="ATH-1", ankle_conf=0.92, knee_conf=0.95, hip_conf=0.96):
    return DeliveryIngestionRequest(
        delivery_id=delivery_id,
        session_id="SES-1",
        athlete_id=athlete_id,
        capture_metadata=CaptureMetadata(
            fps=FPS, pacing_jitter_pct=2.1, shutter_speed_sec=0.001,
            distance_meters=3.0, tripod_height_meters=1.1, camera_roll_deg=1.2,
        ),
        raw_keypoints=make_frames(ankle_conf, knee_conf, hip_conf),
    )


@pytest.fixture
def fake_repo(monkeypatch):
    calls = {"saved_verdicts": [], "saved_deliveries": []}
    monkeypatch.setattr(repository, "save_delivery", lambda req: calls["saved_deliveries"].append(req))
    monkeypatch.setattr(repository, "get_baseline", lambda athlete_id, metric: repository.BaselineRecord(148.0, 3.5))
    monkeypatch.setattr(repository, "get_rolling_history_deltas", lambda athlete_id, metric: [])

    def fake_save_verdict(**kwargs):
        calls["saved_verdicts"].append(kwargs)
        return "verdict-uuid-1"

    monkeypatch.setattr(repository, "save_verdict", fake_save_verdict)
    monkeypatch.setattr(repository, "get_drill", lambda drill_id: None)
    return calls


def test_evaluate_delivery_persists_and_returns_report(fake_repo):
    report = pipeline.evaluate_delivery(make_request())

    assert report.delivery_id == "DEL-1"
    assert report.kinematics.front_knee_angle_deg is not None
    assert len(fake_repo["saved_deliveries"]) == 1
    assert len(fake_repo["saved_verdicts"]) == 1
    assert fake_repo["saved_verdicts"][0]["metric"] == pipeline.FRONT_KNEE_METRIC


def test_evaluate_delivery_raises_on_unknown_baseline(monkeypatch, fake_repo):
    monkeypatch.setattr(repository, "get_baseline", lambda athlete_id, metric: None)
    with pytest.raises(pipeline.UnknownBaselineError):
        pipeline.evaluate_delivery(make_request())


def test_evaluate_delivery_data_suppressed_skips_baseline_lookup(monkeypatch, fake_repo):
    baseline_calls = []
    monkeypatch.setattr(repository, "get_baseline", lambda *a: baseline_calls.append(a) or None)

    report = pipeline.evaluate_delivery(make_request(knee_conf=0.30))

    assert report.verdict.status == DeliveryStatus.DATA_SUPPRESSED
    assert baseline_calls == []  # never reached - quality firewall short-circuits first


def test_nudge_and_reevaluate_shifts_ffs_frame(monkeypatch, fake_repo):
    request = make_request()
    monkeypatch.setattr(
        repository, "get_delivery_frames", lambda delivery_id: (request.raw_keypoints, request.capture_metadata)
    )
    monkeypatch.setattr(repository, "get_latest_verdict_for_delivery", lambda delivery_id: {"id": "verdict-uuid-1"})
    monkeypatch.setattr(repository, "get_athlete_id_for_delivery", lambda delivery_id: "ATH-1")

    original_ffs = pipeline.detect_ffs_frame(pipeline._filtered_or_raw(request.raw_keypoints, FPS))
    report = pipeline.nudge_and_reevaluate("DEL-1", frame_delta=1)

    assert report.kinematics.ffs_frame == original_ffs + 1


def test_nudge_and_reevaluate_raises_not_found_without_prior_verdict(monkeypatch, fake_repo):
    request = make_request()
    monkeypatch.setattr(
        repository, "get_delivery_frames", lambda delivery_id: (request.raw_keypoints, request.capture_metadata)
    )
    monkeypatch.setattr(repository, "get_latest_verdict_for_delivery", lambda delivery_id: None)

    with pytest.raises(repository.NotFoundError):
        pipeline.nudge_and_reevaluate("DEL-1", frame_delta=1)


def test_nudge_and_reevaluate_rejects_out_of_range_frame(monkeypatch, fake_repo):
    request = make_request()
    monkeypatch.setattr(
        repository, "get_delivery_frames", lambda delivery_id: (request.raw_keypoints, request.capture_metadata)
    )
    monkeypatch.setattr(repository, "get_latest_verdict_for_delivery", lambda delivery_id: {"id": "verdict-uuid-1"})
    monkeypatch.setattr(repository, "get_athlete_id_for_delivery", lambda delivery_id: "ATH-1")

    with pytest.raises(ValueError):
        pipeline.nudge_and_reevaluate("DEL-1", frame_delta=1000)
