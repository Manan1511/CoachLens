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
    repository.confirm_baseline("ATH-1", "front_knee_angle_deg", 148.0, 3.5, confirmed_by="COACH-1")
    mock_db.table.assert_any_call("baselines")
    mock_db.table.return_value.upsert.assert_called_once_with(
        {
            "athlete_id": "ATH-1",
            "metric": "front_knee_angle_deg",
            "fixed_median_deg": 148.0,
            "fixed_iqr_deg": 3.5,
            "confirmed_by": "COACH-1",
        }
    )


def test_get_rolling_history_deltas_empty_when_no_sessions(mock_db):
    _execute_returns(
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value, []
    )
    assert repository.get_rolling_history_deltas("ATH-NOBODY", "front_knee_angle_deg") == []


def test_get_rolling_history_deltas_chains_sessions_deliveries_verdicts(mock_db):
    def table_side_effect(name):
        m = MagicMock()
        if name == "sessions":
            _execute_returns(m.select.return_value.eq.return_value.order.return_value.limit.return_value, [{"id": "SES-1"}])
        elif name == "deliveries":
            _execute_returns(m.select.return_value.in_.return_value, [{"id": "DEL-1"}, {"id": "DEL-2"}])
        elif name == "verdicts":
            chain_end = m.select.return_value.in_.return_value.eq.return_value.order.return_value
            # Stored newest-first (as queried); function should reverse to oldest-first.
            _execute_returns(
                chain_end,
                [
                    {"delivery_id": "DEL-2", "delta_deg": -14.0},
                    {"delivery_id": "DEL-1", "delta_deg": -13.0},
                ],
            )
        return m

    mock_db.table.side_effect = table_side_effect
    deltas = repository.get_rolling_history_deltas("ATH-1", "front_knee_angle_deg")
    assert deltas == [-13.0, -14.0]


def test_get_rolling_history_deltas_skips_data_suppressed_without_shrinking_window(mock_db):
    """Regression test: a DATA_SUPPRESSED verdict (delta_deg is None) must
    not consume one of the `limit` slots - it should be skipped entirely so
    older valid deliveries still fill the window."""

    def table_side_effect(name):
        m = MagicMock()
        if name == "sessions":
            _execute_returns(m.select.return_value.eq.return_value.order.return_value.limit.return_value, [{"id": "SES-1"}])
        elif name == "deliveries":
            _execute_returns(
                m.select.return_value.in_.return_value,
                [{"id": "DEL-1"}, {"id": "DEL-2"}, {"id": "DEL-3"}],
            )
        elif name == "verdicts":
            chain_end = m.select.return_value.in_.return_value.eq.return_value.order.return_value
            _execute_returns(
                chain_end,
                [
                    {"delivery_id": "DEL-3", "delta_deg": None},  # DATA_SUPPRESSED - newest
                    {"delivery_id": "DEL-2", "delta_deg": -9.0},
                    {"delivery_id": "DEL-1", "delta_deg": -8.0},
                ],
            )
        return m

    mock_db.table.side_effect = table_side_effect
    deltas = repository.get_rolling_history_deltas("ATH-1", "front_knee_angle_deg", limit=2)
    assert deltas == [-8.0, -9.0]


def test_get_rolling_history_deltas_dedupes_nudged_delivery_keeping_latest(mock_db):
    """Regression test: a delivery re-evaluated via Nudge FFS has two verdict
    rows (save_verdict inserts rather than replaces). Only the most recent
    one should count, not both."""

    def table_side_effect(name):
        m = MagicMock()
        if name == "sessions":
            _execute_returns(m.select.return_value.eq.return_value.order.return_value.limit.return_value, [{"id": "SES-1"}])
        elif name == "deliveries":
            _execute_returns(m.select.return_value.in_.return_value, [{"id": "DEL-1"}, {"id": "DEL-2"}])
        elif name == "verdicts":
            chain_end = m.select.return_value.in_.return_value.eq.return_value.order.return_value
            _execute_returns(
                chain_end,
                [
                    {"delivery_id": "DEL-2", "delta_deg": -10.0},  # DEL-2's nudged (latest) verdict
                    {"delivery_id": "DEL-1", "delta_deg": -8.0},
                    {"delivery_id": "DEL-2", "delta_deg": -9.0},  # DEL-2's original, pre-nudge verdict
                ],
            )
        return m

    mock_db.table.side_effect = table_side_effect
    deltas = repository.get_rolling_history_deltas("ATH-1", "front_knee_angle_deg")
    assert deltas == [-8.0, -10.0]


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
        trunk_tilt_deg=18.5,
        trunk_tilt_confidence=0.91,
    )

    assert verdict_id == "verdict-uuid-1"
    inserted = mock_db.table.return_value.insert.call_args[0][0]
    assert inserted["status"] == "TECHNICAL_CONCERN"
    assert inserted["window_pattern"] == "3_OF_5_MATCHED"
    assert inserted["event_frame"] == 73
    assert inserted["observed_value_deg"] == 134.0
    assert inserted["trunk_tilt_deg"] == 18.5
    assert inserted["trunk_tilt_confidence"] == 0.91


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
                        "trunk_tilt_deg": 18.5,
                        "trunk_tilt_confidence": 0.91,
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
    assert report.kinematics.forward_trunk_tilt_deg == 18.5
    assert report.kinematics.trunk_tilt_confidence == 0.91
    assert report.baselines.fixed_reference_median_deg == 148.0
    assert report.proposed_action.drill_id == "DRL-SNC-012"


def test_get_report_returns_none_when_no_verdict(mock_db):
    _execute_returns(mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value, [])
    assert repository.get_report("DEL-MISSING") is None


def test_get_athlete_id_for_session_returns_athlete(mock_db):
    _execute_returns(mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value, [{"athlete_id": "ATH-1"}])
    assert repository.get_athlete_id_for_session("SES-1") == "ATH-1"


def test_get_athlete_id_for_session_raises_not_found(mock_db):
    _execute_returns(mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value, [])
    with pytest.raises(repository.NotFoundError):
        repository.get_athlete_id_for_session("SES-MISSING")


def test_get_or_create_session_raises_not_found_for_unknown_athlete(mock_db):
    _execute_returns(mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value, [])
    with pytest.raises(repository.NotFoundError):
        repository.get_or_create_session("ATH-MISSING")


def test_get_or_create_session_reuses_existing_session_for_same_day(mock_db):
    """Regression test: a coach quick-switching back to a bowler already
    recorded today must get the same session_id back, not a duplicate."""
    from datetime import date

    sessions_mock = MagicMock()
    _execute_returns(
        sessions_mock.select.return_value.eq.return_value.eq.return_value.limit.return_value,
        [{"id": "SES-EXISTING"}],
    )

    def table_side_effect(name):
        if name == "athletes":
            m = MagicMock()
            _execute_returns(m.select.return_value.eq.return_value.limit.return_value, [{"id": "ATH-1"}])
            return m
        elif name == "sessions":
            return sessions_mock
        raise AssertionError(f"unexpected table {name!r}")

    mock_db.table.side_effect = table_side_effect
    session_id, session_date, created = repository.get_or_create_session("ATH-1", session_date=date(2026, 9, 12))
    assert session_id == "SES-EXISTING"
    assert session_date == date(2026, 9, 12)
    assert created is False
    sessions_mock.insert.assert_not_called()


def test_get_or_create_session_creates_new_session_when_none_exists_today(mock_db):
    from datetime import date

    sessions_mock = MagicMock()
    _execute_returns(sessions_mock.select.return_value.eq.return_value.eq.return_value.limit.return_value, [])

    def table_side_effect(name):
        if name == "athletes":
            m = MagicMock()
            _execute_returns(m.select.return_value.eq.return_value.limit.return_value, [{"id": "ATH-1"}])
            return m
        elif name == "sessions":
            return sessions_mock
        raise AssertionError(f"unexpected table {name!r}")

    mock_db.table.side_effect = table_side_effect
    session_id, session_date, created = repository.get_or_create_session("ATH-1", session_date=date(2026, 9, 12))
    assert created is True
    assert session_date == date(2026, 9, 12)
    inserted = sessions_mock.insert.call_args[0][0]
    assert inserted["id"] == session_id
    assert inserted["athlete_id"] == "ATH-1"
    assert inserted["session_date"] == "2026-09-12"
