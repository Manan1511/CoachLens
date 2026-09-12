"""Builds the 5-delivery demo scenario shared by tests/test_demo_scenario.py
(which verifies the sequence against a fake in-memory repository) and
demo_walkthrough.py (which POSTs the same deliveries to a real running
server). Single source of truth so the two can't silently diverge.

Geometry: hip=(800,1300), knee=(800,1400) are fixed. The ankle position at
the plant frame is placed at a chosen front-knee angle theta by construction
- ankle = knee + R*(sin(theta), -cos(theta)) - so front_knee_angle_deg
returns exactly theta regardless of R, since u=knee->hip=(0,-100) is itself
that same formula at theta=0.
"""

import math
from dataclasses import dataclass

ATHLETE_ID = "ATH-DEMO-01"
SESSION_ID = "SES-DEMO-01"
BASELINE_MEDIAN_DEG = 148.0
BASELINE_IQR_DEG = 3.5

HIP = (800.0, 1300.0)
KNEE = (800.0, 1400.0)
FPS = 120
FRAME_COUNT = 30
PLANT_INDEX = 20


@dataclass
class DemoDelivery:
    delivery_id: str
    theta_deg: float
    knee_conf: float
    expected_status: str


# Chosen so that, evaluated in order against BASELINE_MEDIAN_DEG/IQR above:
#   D1 147.5deg (delta -0.5)  -> within band                -> FORM_BENCHMARK
#   D2 140.0deg (delta -8.0)  -> outlier, no history yet     -> MECHANICAL_WATCH (1 match)
#   D3 139.0deg (delta -9.0)  -> outlier, D2 matches         -> MECHANICAL_WATCH (2 matches)
#   D4 138.0deg (delta -10.0) -> outlier, D2+D3 match        -> TECHNICAL_CONCERN (3 matches)
#   D5 (low confidence)       -> quality firewall short-circuits -> DATA_SUPPRESSED
DEMO_DELIVERIES = [
    DemoDelivery("DEL-DEMO-01", theta_deg=147.5, knee_conf=0.95, expected_status="FORM_BENCHMARK"),
    DemoDelivery("DEL-DEMO-02", theta_deg=140.0, knee_conf=0.94, expected_status="MECHANICAL_WATCH"),
    DemoDelivery("DEL-DEMO-03", theta_deg=139.0, knee_conf=0.93, expected_status="MECHANICAL_WATCH"),
    DemoDelivery("DEL-DEMO-04", theta_deg=138.0, knee_conf=0.94, expected_status="TECHNICAL_CONCERN"),
    DemoDelivery("DEL-DEMO-05", theta_deg=140.0, knee_conf=0.30, expected_status="DATA_SUPPRESSED"),
]


def _ankle_at_angle(theta_deg: float, radius: float = 300.0) -> tuple[float, float]:
    theta = math.radians(theta_deg)
    return (KNEE[0] + radius * math.sin(theta), KNEE[1] - radius * math.cos(theta))


def build_delivery_payload(demo: DemoDelivery) -> dict:
    ankle_target = _ankle_at_angle(demo.theta_deg)
    dt = 1000.0 / FPS
    frames = []
    for i in range(FRAME_COUNT):
        if i < PLANT_INDEX:
            y = 800.0 + (i / PLANT_INDEX) * (ankle_target[1] - 800.0)
            x = 700.0 + i * 5.0
        else:
            y, x = ankle_target[1], ankle_target[0]
        frames.append(
            {
                "frame": i,
                "t_ms": i * dt,
                "knee": {"x": KNEE[0], "y": KNEE[1], "conf": demo.knee_conf},
                "hip": {"x": HIP[0], "y": HIP[1], "conf": 0.96},
                "ankle": {"x": x, "y": y, "conf": 0.92},
            }
        )
    return {
        "delivery_id": demo.delivery_id,
        "session_id": SESSION_ID,
        "athlete_id": ATHLETE_ID,
        "capture_metadata": {
            "fps": FPS,
            "pacing_jitter_pct": 2.1,
            "shutter_speed_sec": 0.001,
            "distance_meters": 3.0,
            "tripod_height_meters": 1.1,
            "camera_roll_deg": 1.2,
        },
        "raw_keypoints": frames,
    }
