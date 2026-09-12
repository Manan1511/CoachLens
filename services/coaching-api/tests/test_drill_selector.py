"""Unit tests for drill selection logic and biomechanical fault diagnostics."""
import pytest

from src.coaching.drill_selector import (
    DRILL_KNEE_COLLAPSE_ISOMETRIC,
    DRILL_KNEE_LOCKOUT_DECELERATION,
    DRILL_TRUNK_HYPERFLEXION_HOLD,
    DRILL_TRUNK_UPRIGHT_TOW,
    BiomechanicalFault,
    diagnose_fault,
    select_corrective_drill,
)
from src.schemas.status import DeliveryStatus


def test_diagnose_fault_knee_collapse():
    fault = diagnose_fault("front_knee_angle_deg", delta_deg=-7.2)
    assert fault == BiomechanicalFault.FRONT_KNEE_COLLAPSE


def test_diagnose_fault_knee_lockout():
    fault = diagnose_fault("front_knee_angle_deg", delta_deg=6.5)
    assert fault == BiomechanicalFault.FRONT_KNEE_LOCKOUT


def test_diagnose_fault_trunk_hyperflexion():
    fault = diagnose_fault("forward_trunk_tilt_deg", delta_deg=8.0)
    assert fault == BiomechanicalFault.TRUNK_HYPERFLEXION


def test_diagnose_fault_trunk_upright():
    fault = diagnose_fault("forward_trunk_tilt_deg", delta_deg=-9.0)
    assert fault == BiomechanicalFault.TRUNK_UPRIGHT_STALL


def test_diagnose_fault_secondary_trunk_tilt():
    fault = diagnose_fault(
        metric="front_knee_angle_deg",
        delta_deg=None,
        trunk_tilt_deg=42.0,
        trunk_baseline_deg=30.0,
    )
    assert fault == BiomechanicalFault.TRUNK_HYPERFLEXION


@pytest.mark.parametrize(
    "status",
    [
        DeliveryStatus.FORM_BENCHMARK,
        DeliveryStatus.MECHANICAL_WATCH,
        DeliveryStatus.DATA_SUPPRESSED,
        DeliveryStatus.BENCHMARK_PENDING,
    ],
)
def test_select_corrective_drill_non_technical_concern_returns_none(status):
    """PRD §8 invariant: Non-TECHNICAL_CONCERN statuses (including MECHANICAL_WATCH)
    must NEVER propose an active drill."""
    drill = select_corrective_drill(
        status=status,
        metric="front_knee_angle_deg",
        delta_deg=-10.0,
    )
    assert drill is None


def test_select_corrective_drill_knee_collapse_assigns_isometric():
    drill = select_corrective_drill(
        status=DeliveryStatus.TECHNICAL_CONCERN,
        metric="front_knee_angle_deg",
        delta_deg=-7.5,
    )
    assert drill == DRILL_KNEE_COLLAPSE_ISOMETRIC
    assert drill == "DRL-SNC-012"


def test_select_corrective_drill_knee_lockout_assigns_deceleration():
    drill = select_corrective_drill(
        status=DeliveryStatus.TECHNICAL_CONCERN,
        metric="front_knee_angle_deg",
        delta_deg=8.2,
    )
    assert drill == DRILL_KNEE_LOCKOUT_DECELERATION
    assert drill == "DRL-KNE-015"


def test_select_corrective_drill_trunk_hyperflexion_assigns_anti_flexion():
    drill = select_corrective_drill(
        status=DeliveryStatus.TECHNICAL_CONCERN,
        metric="forward_trunk_tilt_deg",
        delta_deg=7.0,
    )
    assert drill == DRILL_TRUNK_HYPERFLEXION_HOLD
    assert drill == "DRL-TRK-004"


def test_select_corrective_drill_trunk_upright_assigns_tow():
    drill = select_corrective_drill(
        status=DeliveryStatus.TECHNICAL_CONCERN,
        metric="forward_trunk_tilt_deg",
        delta_deg=-6.5,
    )
    assert drill == DRILL_TRUNK_UPRIGHT_TOW
    assert drill == "DRL-TRK-007"
