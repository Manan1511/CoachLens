import math

from src.schemas.delivery import Landmark


def _vector(a: Landmark, b: Landmark) -> tuple[float, float]:
    return (b.x - a.x, b.y - a.y)


def _angle_between_deg(u: tuple[float, float], v: tuple[float, float]) -> float:
    dot = u[0] * v[0] + u[1] * v[1]
    mag_u = math.hypot(*u)
    mag_v = math.hypot(*v)
    if mag_u == 0 or mag_v == 0:
        raise ValueError("Cannot compute an angle with a zero-length vector.")
    cos_theta = max(-1.0, min(1.0, dot / (mag_u * mag_v)))
    return math.degrees(math.acos(cos_theta))


def front_knee_angle_deg(hip: Landmark, knee: Landmark, ankle: Landmark) -> float:
    """PRD §5 Metric 1: vertex at the knee, rays to hip and ankle."""
    ray_to_hip = _vector(knee, hip)
    ray_to_ankle = _vector(knee, ankle)
    return _angle_between_deg(ray_to_hip, ray_to_ankle)


def forward_trunk_tilt_deg(hip: Landmark, shoulder: Landmark) -> float:
    """PRD §5 Metric 2: vertex at mid-pelvis (hip), vector to mid-shoulder,
    measured against the vertical reference axis [0, -1]."""
    trunk_vector = _vector(hip, shoulder)
    vertical_axis = (0.0, -1.0)
    return _angle_between_deg(trunk_vector, vertical_axis)
