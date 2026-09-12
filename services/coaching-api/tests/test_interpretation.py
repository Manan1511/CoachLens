import math

import pytest

from src.interpretation.angles import forward_trunk_tilt_deg, front_knee_angle_deg
from src.interpretation.baseline import evaluate_delivery_deviation
from src.schemas.delivery import Landmark
from src.schemas.status import DeliveryStatus, WindowPattern


# ---- angles ----

def test_front_knee_angle_straight_leg_is_180():
    hip = Landmark(x=100, y=0, conf=1)
    knee = Landmark(x=100, y=100, conf=1)
    ankle = Landmark(x=100, y=200, conf=1)  # co-linear with hip through knee
    assert front_knee_angle_deg(hip, knee, ankle) == pytest.approx(180.0, abs=0.01)


def test_front_knee_angle_right_angle_bend_is_90():
    hip = Landmark(x=100, y=0, conf=1)
    knee = Landmark(x=100, y=100, conf=1)
    ankle = Landmark(x=200, y=100, conf=1)  # perpendicular to hip-knee ray
    assert front_knee_angle_deg(hip, knee, ankle) == pytest.approx(90.0, abs=0.01)


def test_trunk_tilt_upright_is_zero():
    hip = Landmark(x=100, y=200, conf=1)
    shoulder = Landmark(x=100, y=0, conf=1)  # directly above hip
    assert forward_trunk_tilt_deg(hip, shoulder) == pytest.approx(0.0, abs=0.01)


def test_trunk_tilt_45_degree_lean():
    hip = Landmark(x=100, y=200, conf=1)
    shoulder = Landmark(x=200, y=100, conf=1)  # 45 degrees forward-and-up
    assert forward_trunk_tilt_deg(hip, shoulder) == pytest.approx(45.0, abs=0.01)


def test_angle_raises_on_zero_length_vector():
    hip = Landmark(x=100, y=100, conf=1)
    knee = Landmark(x=100, y=100, conf=1)  # same point as hip -> zero vector
    ankle = Landmark(x=200, y=100, conf=1)
    with pytest.raises(ValueError):
        front_knee_angle_deg(hip, knee, ankle)


# ---- dual-baseline / rolling window (PRD §6.2 / §7.2 example) ----

def test_form_benchmark_when_within_baseline():
    result = evaluate_delivery_deviation(
        observed_deg=147.0,
        fixed_baseline_median_deg=148.0,
        fixed_baseline_iqr_deg=3.5,
        rolling_history_deltas=[],
    )
    assert result.status == DeliveryStatus.FORM_BENCHMARK
    assert result.window_pattern == WindowPattern.NOT_APPLICABLE


def test_mechanical_watch_on_isolated_outlier():
    # One big deviation, but history shows no consistent pattern.
    result = evaluate_delivery_deviation(
        observed_deg=134.0,
        fixed_baseline_median_deg=148.0,
        fixed_baseline_iqr_deg=3.5,
        rolling_history_deltas=[0.5, -1.0, 0.2, -0.8],
    )
    assert result.status == DeliveryStatus.MECHANICAL_WATCH
    assert result.window_pattern == WindowPattern.ISOLATED
    assert result.window_matches < 3


def test_technical_concern_on_3_of_5_matched():
    # Matches the PRD §7.2 example: observed 134.0 vs fixed ref 148.0 -> delta -14.0.
    result = evaluate_delivery_deviation(
        observed_deg=134.0,
        fixed_baseline_median_deg=148.0,
        fixed_baseline_iqr_deg=3.5,
        rolling_history_deltas=[-13.0, -12.0, -14.0, -13.0],
    )
    assert result.status == DeliveryStatus.TECHNICAL_CONCERN
    assert result.window_pattern == WindowPattern.THREE_OF_FIVE_MATCHED
    assert result.window_matches >= 3
    assert result.delta_deg == pytest.approx(-14.0)


def test_opposite_direction_deviations_do_not_count_as_matching():
    # History has large deviations, but in the opposite direction - shouldn't
    # count toward the 3-of-5 window for a delta in the other direction. The
    # current delivery always matches itself (delta * delta > 0 trivially),
    # so the floor is 1, not 0 - that's what we're actually asserting here.
    result = evaluate_delivery_deviation(
        observed_deg=134.0,  # delta -14.0
        fixed_baseline_median_deg=148.0,
        fixed_baseline_iqr_deg=3.5,
        rolling_history_deltas=[13.0, 12.0, 14.0, 13.0],  # all positive deltas
    )
    assert result.status == DeliveryStatus.MECHANICAL_WATCH
    assert result.window_matches == 1
