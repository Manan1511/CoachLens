"""Biomechanical drill decision engine.

Maps kinematic deviation metrics, directions, and verdict statuses to
accredited Strength & Conditioning (S&C) drills from the catalog.
"""
from enum import StrEnum

from src.schemas.status import DeliveryStatus

# Accredited Drill IDs matching the Supabase `drills` table
DRILL_KNEE_COLLAPSE_ISOMETRIC = "DRL-SNC-012"  # Step-Down Landing Holds (UKCC L3)
DRILL_KNEE_LOCKOUT_DECELERATION = "DRL-KNE-015"  # Single-Leg Deceleration Catch Drops (ECB Module 4)
DRILL_TRUNK_HYPERFLEXION_HOLD = "DRL-TRK-004"  # Tall-Spine Cable Anti-Flexion Holds (BCCI L2)
DRILL_TRUNK_UPRIGHT_TOW = "DRL-TRK-007"  # Harness Tow Bowler Pull-Throughs (UKCC Framework)
DRILL_STRIDE_DECELERATION = "DRL-PLY-008"  # Bound-to-Stick Stride Decelerations (Cricket Australia)


class BiomechanicalFault(StrEnum):
    FRONT_KNEE_COLLAPSE = "FRONT_KNEE_COLLAPSE"
    FRONT_KNEE_LOCKOUT = "FRONT_KNEE_LOCKOUT"
    TRUNK_HYPERFLEXION = "TRUNK_HYPERFLEXION"
    TRUNK_UPRIGHT_STALL = "TRUNK_UPRIGHT_STALL"


FAULT_TO_DRILL: dict[BiomechanicalFault, str] = {
    BiomechanicalFault.FRONT_KNEE_COLLAPSE: DRILL_KNEE_COLLAPSE_ISOMETRIC,
    BiomechanicalFault.FRONT_KNEE_LOCKOUT: DRILL_KNEE_LOCKOUT_DECELERATION,
    BiomechanicalFault.TRUNK_HYPERFLEXION: DRILL_TRUNK_HYPERFLEXION_HOLD,
    BiomechanicalFault.TRUNK_UPRIGHT_STALL: DRILL_TRUNK_UPRIGHT_TOW,
}


def diagnose_fault(
    metric: str,
    delta_deg: float | None,
    trunk_tilt_deg: float | None = None,
    trunk_baseline_deg: float | None = None,
) -> BiomechanicalFault | None:
    """Diagnoses the specific biomechanical fault from kinematics and baseline deltas.

    - Front Knee Angle:
      * Negative delta (delta_deg < 0): Knee flexes deeper than baseline -> Collapse under impact.
      * Positive delta (delta_deg > 0): Knee straighter than baseline -> Lockout / hyperextension.
    - Trunk Tilt:
      * Forward tilt exceeds baseline -> Hyper-flexion (collapsing forward).
      * Forward tilt below baseline -> Upright torso stall.
    """
    if metric == "front_knee_angle_deg" and delta_deg is not None:
        if delta_deg < 0.0:
            return BiomechanicalFault.FRONT_KNEE_COLLAPSE
        elif delta_deg > 0.0:
            return BiomechanicalFault.FRONT_KNEE_LOCKOUT

    if metric == "forward_trunk_tilt_deg" and delta_deg is not None:
        if delta_deg > 0.0:
            return BiomechanicalFault.TRUNK_HYPERFLEXION
        elif delta_deg < 0.0:
            return BiomechanicalFault.TRUNK_UPRIGHT_STALL

    # Secondary check: if evaluating knee, but trunk tilt delta is provided
    if trunk_tilt_deg is not None and trunk_baseline_deg is not None:
        trunk_delta = trunk_tilt_deg - trunk_baseline_deg
        if trunk_delta > 5.0:
            return BiomechanicalFault.TRUNK_HYPERFLEXION
        elif trunk_delta < -5.0:
            return BiomechanicalFault.TRUNK_UPRIGHT_STALL

    return None


def select_corrective_drill(
    status: DeliveryStatus,
    metric: str = "front_knee_angle_deg",
    delta_deg: float | None = None,
    trunk_tilt_deg: float | None = None,
    trunk_baseline_deg: float | None = None,
) -> str | None:
    """Decides which drill to assign based on verdict status and fault diagnosis.

    Rules:
    1. Only TECHNICAL_CONCERN (repeatable 3-of-5 deviation) triggers an active drill.
    2. FORM_BENCHMARK, MECHANICAL_WATCH (replay-only), DATA_SUPPRESSED, and
       BENCHMARK_PENDING return None per PRD §8 invariant.
    3. If TECHNICAL_CONCERN, maps the directional fault to the corresponding
       credentialed S&C drill.
    """
    if status != DeliveryStatus.TECHNICAL_CONCERN:
        return None

    fault = diagnose_fault(
        metric=metric,
        delta_deg=delta_deg,
        trunk_tilt_deg=trunk_tilt_deg,
        trunk_baseline_deg=trunk_baseline_deg,
    )

    if fault is not None:
        return FAULT_TO_DRILL.get(fault, DRILL_KNEE_COLLAPSE_ISOMETRIC)

    # Default fallback for front knee technical concern
    return DRILL_KNEE_COLLAPSE_ISOMETRIC
