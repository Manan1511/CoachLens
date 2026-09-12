from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from src.coaching.export import format_whatsapp_card
from src.main import app
from src.schemas.report import Baselines, CoachingReport, Kinematics, ProposedAction, Verdict
from src.schemas.status import DeliveryStatus, WindowPattern

SAMPLE_DELIVERY_ID = "DEL-20260912-0042"
SAMPLE_REPORT_ID = "RPT-9382104"
SAMPLE_TIMESTAMP = datetime(2026, 9, 12, 10, 15, 32, tzinfo=timezone.utc)


@pytest.fixture
def benchmark_report() -> CoachingReport:
    return CoachingReport(
        report_id=SAMPLE_REPORT_ID,
        delivery_id=SAMPLE_DELIVERY_ID,
        evaluation_timestamp=SAMPLE_TIMESTAMP,
        kinematics=Kinematics(ffs_frame=73, front_knee_angle_deg=147.5, front_knee_confidence=0.95),
        baselines=Baselines(
            fixed_reference_median_deg=148.0,
            fixed_reference_iqr_deg=3.5,
            delta_deg=-0.5,
            uncertainty_band_deg=3.2,
        ),
        verdict=Verdict(
            status=DeliveryStatus.FORM_BENCHMARK,
            window_pattern=WindowPattern.NOT_APPLICABLE,
            window_matches=0,
            summary="Within established baseline range.",
        ),
    )


@pytest.fixture
def technical_concern_report() -> CoachingReport:
    return CoachingReport(
        report_id=SAMPLE_REPORT_ID,
        delivery_id=SAMPLE_DELIVERY_ID,
        evaluation_timestamp=SAMPLE_TIMESTAMP,
        kinematics=Kinematics(ffs_frame=73, front_knee_angle_deg=138.0, front_knee_confidence=0.94),
        baselines=Baselines(
            fixed_reference_median_deg=148.0,
            fixed_reference_iqr_deg=3.5,
            delta_deg=-10.0,
            uncertainty_band_deg=3.2,
        ),
        verdict=Verdict(
            status=DeliveryStatus.TECHNICAL_CONCERN,
            window_pattern=WindowPattern.THREE_OF_FIVE_MATCHED,
            window_matches=3,
            trigger_context_deltas=[-8.0, -9.0, -10.0],
            summary="Persistent front-knee flexion deviation detected under ground impact.",
        ),
        proposed_action=ProposedAction(
            drill_id="DRL-SNC-012",
            title="Step-Down Landing Holds",
            prescription="3 sets x 6 reps off 12-inch box focusing on isometric extension.",
            contraindications=["patellar_tendon_pain", "acute_knee_swelling"],
            credential="UKCC Level 3 S&C Standard",
        ),
    )


@pytest.fixture
def data_suppressed_report() -> CoachingReport:
    return CoachingReport(
        report_id=SAMPLE_REPORT_ID,
        delivery_id=SAMPLE_DELIVERY_ID,
        evaluation_timestamp=SAMPLE_TIMESTAMP,
        kinematics=Kinematics(ffs_frame=73),
        baselines=Baselines(),
        verdict=Verdict(
            status=DeliveryStatus.DATA_SUPPRESSED,
            window_pattern=WindowPattern.NOT_APPLICABLE,
            window_matches=0,
            summary="Landmark visibility below threshold at the FFS frame.",
        ),
    )


def test_format_whatsapp_card_benchmark(benchmark_report: CoachingReport) -> None:
    card = format_whatsapp_card(benchmark_report)
    assert "*Delivery:* DEL-20260912-0042" in card
    assert "FORM BENCHMARK" in card
    assert "Front Knee Angle: 147.5°" in card
    assert "Baseline Reference: 148.0° (±3.5° IQR)" in card
    assert "Baseline Delta: -0.5°" in card
    assert "Non-diagnostic coaching metric" in card


def test_format_whatsapp_card_technical_concern(technical_concern_report: CoachingReport) -> None:
    card = format_whatsapp_card(technical_concern_report)
    assert "TECHNICAL CONCERN" in card
    assert "Recommended Drill:" in card
    assert "*Step-Down Landing Holds* (DRL-SNC-012)" in card
    assert "UKCC Level 3 S&C Standard" in card
    assert "patellar_tendon_pain, acute_knee_swelling" in card
    assert "3 of rolling window balls matched deviation" in card


def test_format_whatsapp_card_data_suppressed(data_suppressed_report: CoachingReport) -> None:
    card = format_whatsapp_card(data_suppressed_report)
    assert "DATA SUPPRESSED" in card
    assert "Landmark visibility below threshold" in card
    assert "Front Knee Angle" not in card


def test_export_whatsapp_endpoint(monkeypatch: pytest.MonkeyPatch, technical_concern_report: CoachingReport) -> None:
    from src.coaching.auth import require_coach
    from src.coaching.routes import deliveries as deliveries_module

    app.dependency_overrides[require_coach] = lambda: "coach-uuid-123"
    client = TestClient(app)

    monkeypatch.setattr(
        deliveries_module.repository,
        "get_report",
        lambda did: technical_concern_report if did == SAMPLE_DELIVERY_ID else None,
    )

    response = client.get(f"/api/v1/reports/{SAMPLE_DELIVERY_ID}/export/whatsapp")
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_id"] == SAMPLE_DELIVERY_ID
    assert data["status"] == "TECHNICAL_CONCERN"
    assert "Step-Down Landing Holds" in data["formatted_text"]

    # 404 on missing report
    missing = client.get("/api/v1/reports/NON-EXISTENT/export/whatsapp")
    assert missing.status_code == 404

    app.dependency_overrides.clear()

