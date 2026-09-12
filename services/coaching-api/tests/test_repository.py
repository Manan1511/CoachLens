"""Repository tests mock get_supabase() with unittest.mock.MagicMock, which
naturally supports the fluent .table().select().eq()... chains supabase-py
uses - each test configures only the .execute() return value at the right
point in the chain and asserts the calls made, without touching a real
database (no SUPABASE_SERVICE_ROLE_KEY is available in this environment).
"""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from src.coaching import repository
from src.schemas.status import DeliveryStatus, WindowPattern


@pytest.fixture
def mock_db(monkeypatch):
    db = MagicMock()
    monkeypatch.setattr(repository, "get_supabase", lambda: db)
    return db


def _execute_returns(mock_chain_end, data):
    mock_chain_end.execute.return_value = SimpleNamespace(data=data)


def test_get_baseline_returns_none_when_missing(mock_db):
    _execute_returns(mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value, [])
    assert repository.get_baseline("ATH-1", "front_knee_angle_deg") is None


def test_get_baseline_maps_row_to_record(mock_db):
    chain_end = mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value
    _execute_returns(chain_end, [{"fixed_median_deg": 148.0, "fixed_iqr_deg": 3.5}])
    result = repository.get_baseline("ATH-1", "front_knee_angle_deg")
    assert result == repository.BaselineRecord(median_deg=148.0, iqr_deg=3.5)
    mock_db.table.assert_any_call("baselines")


def test_confirm_baseline_upserts_expected_row(mock_db):
    repository.confirm_baseline("ATH-1", "front_knee_angle_deg", 148.0, 3.5)
    mock_db.table.assert_any_call("baselines")
    mock_db.table.return_value.upsert.assert_called_once_with(
        {
            "athlete_id": "ATH-1",
            "metric": "front_knee_angle_deg",
            "fixed_median_deg": 148.0,
            "fixed_iqr_deg": 3.5,
        }
    )


def test_get_rolling_history_deltas_empty_when_no_sessions(mock_db):
    _execute_returns(mock_db.table.return_value.select.return_value.eq.return_value, [])
    assert repository.get_rolling_history_deltas("ATH-NOBODY", "front_knee_angle_deg") == []


def test_get_rolling_history_deltas_chains_sessions_deliveries_verdicts(mock_db):
    def table_side_effect(name):
        m = MagicMock()
        if name == "sessions":
            _execute_returns(m.select.return_value.eq.return_value, [{"id": "SES-1"}])
        elif name == "deliveries":
            _execute_returns(m.select.return_value.in_.return_value, [{"id": "DEL-1"}, {"id": "DEL-2"}])
        elif name == "verdicts":
            chain_end = m.select.return_value.in_.return_value.eq.return_value.order.return_value.limit.return_value
            # Stored newest-first (as queried); function should reverse to oldest-first.
            _execute_returns(chain_end, [{"delta_deg": -14.0}, {"delta_deg": -13.0}])
        return m

    mock_db.table.side_effect = table_side_effect
    deltas = repository.get_rolling_history_deltas("ATH-1", "front_knee_angle_deg")
    assert deltas == [-13.0, -14.0]


def test_save_verdict_inserts_all_fields_and_returns_id(mock_db):
    chain_end = mock_db.table.return_value.insert.return_value
    _execute_returns(chain_end, [{"id": "verdict-uuid-1"}])

    verdict_id = repository.save_verdict(
        delivery_id="DEL-1",
        metric="front_knee_angle_deg",
        status=DeliveryStatus.TECHNICAL_CONCERN,
        window_pattern=WindowPattern.THREE_OF_FIVE_MATCHED,
        window_matches=3,
        delta_deg=-14.0,
        uncertainty_band_deg=3.2,
        summary="Persistent deviation.",
        drill_id="DRL-SNC-012",
        event_frame=73,
        observed_value_deg=134.0,
        confidence=0.94,
    )

    assert verdict_id == "verdict-uuid-1"
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted["status"] == "TECHNICAL_CONCERN"
    assert inserted["window_pattern"] == "3_OF_5_MATCHED"
    assert inserted["event_frame"] == 73
    assert inserted["observed_value_deg"] == 134.0


def test_get_drill_maps_row_to_proposed_action(mock_db):
    chain_end = mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value
    _execute_returns(
        chain_end,
        [
            {
                "id": "DRL-SNC-012",
                "title": "Step-Down Landing Holds",
                "prescription": "3x6",
                "contraindications": ["patellar_tendon_pain"],
                "credential": "UKCC Level 3",
            }
        ],
    )
    drill = repository.get_drill("DRL-SNC-012")
    assert drill.drill_id == "DRL-SNC-012"
    assert drill.contraindications == ["patellar_tendon_pain"]


def test_get_athlete_id_for_delivery_raises_not_found(mock_db):
    _execute_returns(mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value, [])
    with pytest.raises(repository.NotFoundError):
        repository.get_athlete_id_for_delivery("DEL-MISSING")


def test_get_report_reconstructs_full_report(mock_db):
    def table_side_effect(name):
        m = MagicMock()
        if name == "verdicts":
            chain_end = m.select.return_value.eq.return_value.order.return_value.limit.return_value
            _execute_returns(
                chain_end,
                [
                    {
                        "id": "verdict-1",
                        "status": "TECHNICAL_CONCERN",
                        "window_pattern": "3_OF_5_MATCHED",
                        "window_matches": 3,
                        "delta_deg": -14.0,
                        "uncertainty_band_deg": 3.2,
                        "summary": "Persistent deviation.",
                        "drill_id": "DRL-SNC-012",
                        "event_frame": 73,
                        "observed_value_deg": 134.0,
                        "confidence": 0.94,
                        "metric": "front_knee_angle_deg",
                        "created_at": "2026-09-12T10:15:32+00:00",
                    }
                ],
            )
        elif name == "deliveries":
            _execute_returns(m.select.return_value.eq.return_value.limit.return_value, [{"session_id": "SES-1"}])
        elif name == "sessions":
            _execute_returns(m.select.return_value.eq.return_value.limit.return_value, [{"athlete_id": "ATH-1"}])
        elif name == "baselines":
            _execute_returns(
                m.select.return_value.eq.return_value.eq.return_value.limit.return_value,
                [{"fixed_median_deg": 148.0, "fixed_iqr_deg": 3.5}],
            )
        elif name == "drills":
            _execute_returns(
                m.select.return_value.eq.return_value.limit.return_value,
                [
                    {
                        "id": "DRL-SNC-012",
                        "title": "Step-Down Landing Holds",
                        "prescription": "3x6",
                        "contraindications": [],
                        "credential": "UKCC Level 3",
                    }
                ],
            )
        return m

    mock_db.table.side_effect = table_side_effect
    report = repository.get_report("DEL-1")

    assert report.verdict.status == DeliveryStatus.TECHNICAL_CONCERN
    assert report.kinematics.front_knee_angle_deg == 134.0
    assert report.baselines.fixed_reference_median_deg == 148.0
    assert report.proposed_action.drill_id == "DRL-SNC-012"


def test_get_report_returns_none_when_no_verdict(mock_db):
    _execute_returns(mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value, [])
    assert repository.get_report("DEL-MISSING") is None
