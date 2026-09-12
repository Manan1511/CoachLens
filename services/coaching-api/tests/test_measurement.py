import numpy as np
import pytest

from src.measurement.audit import audit_frame_pacing
from src.measurement.errors import ThermalThrottleError
from src.measurement.events import detect_ffs_frame, detect_release_frame
from src.measurement.filtering import butterworth_filter_frames
from src.measurement.quality import passes_quality_firewall, passes_trunk_tilt_quality_firewall
from src.schemas.delivery import KeypointFrame, Landmark

FPS = 120


def make_frame(frame: int, t_ms: float, knee_conf=0.9, hip_conf=0.9, ankle_y=1000.0, wrist_y=None, shoulder_y=800.0) -> KeypointFrame:
    return KeypointFrame(
        frame=frame,
        t_ms=t_ms,
        knee=Landmark(x=800, y=1400, conf=knee_conf),
        hip=Landmark(x=820, y=1040, conf=hip_conf),
        ankle=Landmark(x=860, y=ankle_y, conf=0.92),
        shoulder=Landmark(x=800, y=shoulder_y, conf=0.9),
        wrist=Landmark(x=800, y=wrist_y, conf=0.9) if wrist_y is not None else None,
    )


# ---- audit ----

def test_audit_passes_for_steady_frame_pacing():
    dt = 1000.0 / FPS
    frames = [make_frame(i, i * dt) for i in range(30)]
    audit_frame_pacing(frames, fps=FPS)  # should not raise


def test_audit_raises_on_thermal_throttle():
    dt = 1000.0 / FPS
    frames = [make_frame(i, i * dt) for i in range(10)]
    # Inject a large gap simulating dropped frames from thermal throttling.
    frames[5] = make_frame(5, frames[4].t_ms + dt * 5)
    with pytest.raises(ThermalThrottleError):
        audit_frame_pacing(frames, fps=FPS)


# ---- quality firewall ----

def test_quality_firewall_passes_above_threshold():
    frame = make_frame(0, 0, knee_conf=0.94, hip_conf=0.96)
    assert passes_quality_firewall(frame) is True


def test_quality_firewall_fails_below_threshold():
    frame = make_frame(0, 0, knee_conf=0.41, hip_conf=0.96)
    assert passes_quality_firewall(frame) is False


def test_trunk_tilt_quality_firewall_requires_shoulder():
    frame = make_frame(0, 0)
    frame.shoulder = None
    assert passes_trunk_tilt_quality_firewall(frame) is False


# ---- filtering ----

def test_butterworth_filter_smooths_noisy_signal():
    dt = 1000.0 / FPS
    n = 60
    rng = np.random.default_rng(42)
    frames = []
    for i in range(n):
        noisy_y = 1000.0 + rng.normal(0, 5.0)
        frames.append(make_frame(i, i * dt, ankle_y=noisy_y))

    filtered = butterworth_filter_frames(frames, fps=FPS)

    raw_variance = np.var([f.ankle.y for f in frames])
    filtered_variance = np.var([f.ankle.y for f in filtered])
    assert filtered_variance < raw_variance
    assert len(filtered) == len(frames)


def test_butterworth_filter_rejects_too_few_frames():
    dt = 1000.0 / FPS
    frames = [make_frame(i, i * dt) for i in range(5)]
    with pytest.raises(ValueError):
        butterworth_filter_frames(frames, fps=FPS)


# ---- FFS detection ----

def test_detect_ffs_frame_finds_ground_contact():
    dt = 1000.0 / FPS
    n = 30
    plant_index = 20
    frames = []
    for i in range(n):
        if i < plant_index:
            # Ankle descending and moving forward before contact.
            y = 800.0 + (i / plant_index) * 200.0
            x = 700.0 + i * 5.0
        else:
            # Ankle planted: height and x position hold steady after contact.
            y = 1000.0
            x = 700.0 + plant_index * 5.0
        frames.append(make_frame(i, i * dt, ankle_y=y))
        frames[-1].ankle.x = x

    detected_frame = detect_ffs_frame(frames)
    # Contact is detected near the plant, allowing a small tolerance since
    # the score is a fused heuristic, not an exact zero-crossing.
    assert abs(detected_frame - plant_index) <= 3


def test_detect_ffs_frame_requires_minimum_frames():
    frames = [make_frame(0, 0), make_frame(1, 8.3)]
    with pytest.raises(ValueError):
        detect_ffs_frame(frames)


# ---- release detection ----

def test_detect_release_frame_finds_highest_wrist_point():
    dt = 1000.0 / FPS
    frames = [
        make_frame(0, 0 * dt, wrist_y=900.0, shoulder_y=800.0),
        make_frame(1, 1 * dt, wrist_y=500.0, shoulder_y=800.0),  # arm overhead: wrist well above shoulder
        make_frame(2, 2 * dt, wrist_y=950.0, shoulder_y=800.0),
    ]
    assert detect_release_frame(frames) == 1


def test_detect_release_frame_requires_wrist_data():
    frames = [make_frame(0, 0, wrist_y=None)]
    with pytest.raises(ValueError):
        detect_release_frame(frames)
