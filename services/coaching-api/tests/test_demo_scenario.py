"""Verifies the hackathon demo narrative actually holds: running the 5
demo deliveries (scripts/demo_fixtures.py) through the real pipeline
produces FORM_BENCHMARK -> MECHANICAL_WATCH -> MECHANICAL_WATCH ->
TECHNICAL_CONCERN -> DATA_SUPPRESSED, in order.

Uses a fake in-memory repository (not mocks per-call) because this test
needs state to accumulate correctly across 5 sequential evaluate_delivery
calls, the same way the real database would - a per-call mock wouldn't
catch a bug in how rolling history builds up over multiple deliveries.
"""

import time

from fastapi.testclient import TestClient

from src.coaching import pipeline, repository
from src.main import app
from src.schemas.delivery import DeliveryIngestionRequest
from scripts.demo_fixtures import DEMO_DELIVERIES, build_delivery_payload

# PRD §9: P50<=8s, P95<=15s per delivery over standard mobile network. This
# only measures the compute path (audit/filter/FFS-detect/angle/
# interpretation) since Supabase round-trip time can't be measured without
# real credentials in this environment - but with no ML inference or video
# upload in this backend, compute is the dominant cost, and DB round-trips
# (a handful of small queries) are expected to add well under a second.
# See scripts/demo_walkthrough.py for the real end-to-end timing check.
COMPUTE_BUDGET_SECONDS = 1.0


class FakeRepository:
    """Minimal in-memory stand-in for repository.py, covering only what
    pipeline.py actually calls. Not a general-purpose fake Supabase."""

    def __init__(self):
        self.baselines = {}
        self.deliveries = {}
        self.verdicts_by_delivery = {}
        self.history = {}

    def get_baseline(self, athlete_id, metric):
        return self.baselines.get((athlete_id, metric))

    def confirm_baseline(self, athlete_id, metric, median_deg, iqr_deg):
        self.baselines[(athlete_id, metric)] = repository.BaselineRecord(median_deg, iqr_deg)

    def get_rolling_history_deltas(self, athlete_id, metric):
        return list(self.history.get((athlete_id, metric), []))

    def save_delivery(self, request):
        self.deliveries[request.delivery_id] = request

    def save_verdict(self, delivery_id, metric, status, window_pattern, window_matches,
                      delta_deg, uncertainty_band_deg, summary, drill_id,
                      event_frame=None, observed_value_deg=None, confidence=None,
                      trigger_deltas=None, filtered=None,
                      trunk_tilt_deg=None, trunk_tilt_confidence=None):
        self.verdicts_by_delivery[delivery_id] = {
            "status": status, "delta_deg": delta_deg, "window_matches": window_matches,
        }
        if delta_deg is not None:
            request = self.deliveries[delivery_id]
            key = (request.athlete_id, metric)
            self.history.setdefault(key, []).append(delta_deg)
        return f"verdict-{delivery_id}"

    def get_drill(self, drill_id):
        return None

    def get_athlete_consent_info(self, athlete_id):
        # dob=None -> consent gate can't determine minor status, lets it
        # through (see pipeline._check_consent) - fine for this demo athlete.
        return repository.AthleteConsentInfo(dob=None, guardian_consent=False)


def test_demo_scenario_produces_expected_status_sequence(monkeypatch):
    fake = FakeRepository()
    monkeypatch.setattr(repository, "get_baseline", fake.get_baseline)
    monkeypatch.setattr(repository, "confirm_baseline", fake.confirm_baseline)
    monkeypatch.setattr(repository, "get_rolling_history_deltas", fake.get_rolling_history_deltas)
    monkeypatch.setattr(repository, "save_delivery", fake.save_delivery)
    monkeypatch.setattr(repository, "save_verdict", fake.save_verdict)
    monkeypatch.setattr(repository, "get_drill", fake.get_drill)
    monkeypatch.setattr(repository, "get_athlete_consent_info", fake.get_athlete_consent_info)

    from scripts.demo_fixtures import ATHLETE_ID, BASELINE_IQR_DEG, BASELINE_MEDIAN_DEG

    fake.confirm_baseline(ATHLETE_ID, pipeline.FRONT_KNEE_METRIC, BASELINE_MEDIAN_DEG, BASELINE_IQR_DEG)

    actual_statuses = []
    compute_times = []
    for demo in DEMO_DELIVERIES:
        payload = build_delivery_payload(demo)
        request = DeliveryIngestionRequest.model_validate(payload)
        start = time.monotonic()
        report = pipeline.evaluate_delivery(request)
        compute_times.append(time.monotonic() - start)
        actual_statuses.append(report.verdict.status.value)

    assert max(compute_times) < COMPUTE_BUDGET_SECONDS, (
        f"Compute-only pipeline time {max(compute_times):.3f}s exceeds the "
        f"{COMPUTE_BUDGET_SECONDS}s budget - investigate before assuming the "
        f"P50<=8s SLA holds once real DB round-trips are added."
    )

    expected_statuses = [d.expected_status for d in DEMO_DELIVERIES]
    assert actual_statuses == expected_statuses


def test_demo_scenario_via_real_http_routes(monkeypatch):
    """Same scenario, but through TestClient -> real routes -> pipeline ->
    repository, matching exactly what demo_walkthrough.py does over HTTP.
    Confirms the JSON shape demo_walkthrough.py reads (baselines.delta_deg,
    verdict.window_matches, verdict.summary) actually exists in the real
    serialized response, not just in the in-process DemoDelivery objects.
    """
    fake = FakeRepository()
    monkeypatch.setattr(repository, "get_baseline", fake.get_baseline)
    monkeypatch.setattr(repository, "confirm_baseline", fake.confirm_baseline)
    monkeypatch.setattr(repository, "get_rolling_history_deltas", fake.get_rolling_history_deltas)
    monkeypatch.setattr(repository, "save_delivery", fake.save_delivery)
    monkeypatch.setattr(repository, "save_verdict", fake.save_verdict)
    monkeypatch.setattr(repository, "get_drill", fake.get_drill)
    monkeypatch.setattr(repository, "get_athlete_consent_info", fake.get_athlete_consent_info)

    from scripts.demo_fixtures import ATHLETE_ID, BASELINE_IQR_DEG, BASELINE_MEDIAN_DEG

    fake.confirm_baseline(ATHLETE_ID, pipeline.FRONT_KNEE_METRIC, BASELINE_MEDIAN_DEG, BASELINE_IQR_DEG)

    client = TestClient(app)
    for demo in DEMO_DELIVERIES:
        payload = build_delivery_payload(demo)
        response = client.post("/api/v1/sessions/delivery", json=payload)
        assert response.status_code == 200, response.text
        report = response.json()
        assert report["verdict"]["status"] == demo.expected_status
        assert "delta_deg" in report["baselines"]
        assert "window_matches" in report["verdict"]
        assert report["verdict"]["summary"]

        if demo.expected_status == "TECHNICAL_CONCERN":
            # The "Why was this flagged?" data (PRD §5): the specific prior
            # deltas that pushed this over the 3-of-5 threshold, not just
            # the aggregate count.
            assert report["verdict"]["trigger_context_deltas"] is not None
            assert len(report["verdict"]["trigger_context_deltas"]) == report["verdict"]["window_matches"]
        elif demo.expected_status in ("FORM_BENCHMARK", "DATA_SUPPRESSED"):
            assert report["verdict"]["trigger_context_deltas"] is None
