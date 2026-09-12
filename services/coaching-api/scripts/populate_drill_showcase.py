"""Populates bowlers and deliveries showcasing all accredited drills in CoachLens."""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.coaching.repository import get_supabase

SHOWCASE_ATHLETES = [
    {
        "id": "ATH-DEMO-07",
        "name": "Jasprit Bumrah",
        "bowling_arm": "RIGHT",
        "dob": "1993-12-06",
        "baselines": [
            {
                "metric": "front_knee_angle_deg",
                "fixed_median_deg": 150.0,
                "fixed_iqr_deg": 3.0,
            }
        ],
        "session_id": "SES-DEMO-07",
        "deliveries": [
            {
                "id": "DEL-JB-01",
                "metric": "front_knee_angle_deg",
                "delta": 0.4,
                "knee": 150.4,
                "tilt": 29.0,
                "status": "FORM_BENCHMARK",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Front knee angle within baseline tolerance.",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-JB-02",
                "metric": "front_knee_angle_deg",
                "delta": 8.5,
                "knee": 158.5,
                "tilt": 28.5,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 1,
                "summary": "Front knee angle hyperextended 8.5° above baseline.",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-JB-03",
                "metric": "front_knee_angle_deg",
                "delta": 9.2,
                "knee": 159.2,
                "tilt": 28.8,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 2,
                "summary": "Front knee angle hyperextended 9.2° above baseline.",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-JB-04",
                "metric": "front_knee_angle_deg",
                "delta": 8.8,
                "knee": 158.8,
                "tilt": 28.6,
                "status": "TECHNICAL_CONCERN",
                "pattern": "3_OF_5_MATCHED",
                "matches": 3,
                "summary": "Front knee angle locked straight (+8.8° above baseline) across 3 of the last 5 deliveries. Flagged for deceleration review.",
                "drill_id": "DRL-KNE-015",  # Single-Leg Deceleration Catch Drops (ECB Module 4)
                "trigger_deltas": [8.5, 9.2, 8.8],
            },
        ],
    },
    {
        "id": "ATH-DEMO-08",
        "name": "Mitchell Starc",
        "bowling_arm": "LEFT",
        "dob": "1990-01-30",
        "baselines": [
            {
                "metric": "front_knee_angle_deg",
                "fixed_median_deg": 160.0,
                "fixed_iqr_deg": 3.2,
            },
            {
                "metric": "forward_trunk_tilt_deg",
                "fixed_median_deg": 28.0,
                "fixed_iqr_deg": 2.5,
            },
        ],
        "session_id": "SES-DEMO-08",
        "deliveries": [
            {
                "id": "DEL-MS-01",
                "metric": "forward_trunk_tilt_deg",
                "delta": 0.3,
                "knee": 160.2,
                "tilt": 28.3,
                "status": "FORM_BENCHMARK",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Forward trunk tilt within established baseline range.",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-MS-02",
                "metric": "forward_trunk_tilt_deg",
                "delta": 8.8,
                "knee": 158.5,
                "tilt": 36.8,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 1,
                "summary": "Forward trunk tilt collapsed 8.8° beyond confirmed baseline.",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-MS-03",
                "metric": "forward_trunk_tilt_deg",
                "delta": 9.5,
                "knee": 158.0,
                "tilt": 37.5,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 2,
                "summary": "Forward trunk tilt collapsed 9.5° beyond confirmed baseline.",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-MS-04",
                "metric": "forward_trunk_tilt_deg",
                "delta": 9.0,
                "knee": 158.2,
                "tilt": 37.0,
                "status": "TECHNICAL_CONCERN",
                "pattern": "3_OF_5_MATCHED",
                "matches": 3,
                "summary": "Forward trunk tilt excessive (+9.0° beyond baseline) across 3 of the last 5 deliveries. Flagged for posture review.",
                "drill_id": "DRL-TRK-004",  # Tall-Spine Cable Anti-Flexion Holds (BCCI L2)
                "trigger_deltas": [8.8, 9.5, 9.0],
            },
        ],
    },
    {
        "id": "ATH-DEMO-09",
        "name": "Kagiso Rabada",
        "bowling_arm": "RIGHT",
        "dob": "1995-05-25",
        "baselines": [
            {
                "metric": "front_knee_angle_deg",
                "fixed_median_deg": 157.0,
                "fixed_iqr_deg": 3.0,
            },
            {
                "metric": "forward_trunk_tilt_deg",
                "fixed_median_deg": 32.0,
                "fixed_iqr_deg": 2.8,
            },
        ],
        "session_id": "SES-DEMO-09",
        "deliveries": [
            {
                "id": "DEL-KR-01",
                "metric": "forward_trunk_tilt_deg",
                "delta": -0.2,
                "knee": 157.2,
                "tilt": 31.8,
                "status": "FORM_BENCHMARK",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Forward trunk tilt within established baseline range.",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-KR-02",
                "metric": "forward_trunk_tilt_deg",
                "delta": -7.5,
                "knee": 156.5,
                "tilt": 24.5,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 1,
                "summary": "Forward trunk tilt upright stall (-7.5° below baseline).",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-KR-03",
                "metric": "forward_trunk_tilt_deg",
                "delta": -8.2,
                "knee": 156.8,
                "tilt": 23.8,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 2,
                "summary": "Forward trunk tilt upright stall (-8.2° below baseline).",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-KR-04",
                "metric": "forward_trunk_tilt_deg",
                "delta": -8.0,
                "knee": 157.0,
                "tilt": 24.0,
                "status": "TECHNICAL_CONCERN",
                "pattern": "3_OF_5_MATCHED",
                "matches": 3,
                "summary": "Torso stalled upright (-8.0° below baseline forward lean) across 3 of the last 5 deliveries. Flagged for momentum transfer review.",
                "drill_id": "DRL-TRK-007",  # Harness Tow Bowler Pull-Throughs (UKCC Framework)
                "trigger_deltas": [-7.5, -8.2, -8.0],
            },
        ],
    },
    {
        "id": "ATH-DEMO-10",
        "name": "Pat Cummins",
        "bowling_arm": "RIGHT",
        "dob": "1993-05-08",
        "baselines": [
            {
                "metric": "front_knee_angle_deg",
                "fixed_median_deg": 155.0,
                "fixed_iqr_deg": 3.0,
            }
        ],
        "session_id": "SES-DEMO-10",
        "deliveries": [
            {
                "id": "DEL-PC-01",
                "metric": "front_knee_angle_deg",
                "delta": -0.2,
                "knee": 154.8,
                "tilt": 29.5,
                "status": "FORM_BENCHMARK",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Front foot stride mechanics within established baseline.",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-PC-02",
                "metric": "front_knee_angle_deg",
                "delta": -8.5,
                "knee": 146.5,
                "tilt": 31.0,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 1,
                "summary": "Stride landing instability detected.",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-PC-03",
                "metric": "front_knee_angle_deg",
                "delta": -9.2,
                "knee": 145.8,
                "tilt": 31.5,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 2,
                "summary": "Stride landing instability detected.",
                "drill_id": None,
                "trigger_deltas": None,
            },
            {
                "id": "DEL-PC-04",
                "metric": "front_knee_angle_deg",
                "delta": -9.0,
                "knee": 146.0,
                "tilt": 31.2,
                "status": "TECHNICAL_CONCERN",
                "pattern": "3_OF_5_MATCHED",
                "matches": 3,
                "summary": "Front foot stride decelerations compromised (-9.0° landing instability) across 3 of the last 5 deliveries.",
                "drill_id": "DRL-PLY-008",  # Bound-to-Stick Stride Decelerations (Cricket Australia)
                "trigger_deltas": [-8.5, -9.2, -9.0],
            },
        ],
    },
]


def populate_drill_showcase():
    db = get_supabase()
    today_str = date.today().isoformat()

    print(f"Populating {len(SHOWCASE_ATHLETES)} showcase bowlers...")

    for athlete_info in SHOWCASE_ATHLETES:
        aid = athlete_info["id"]
        name = athlete_info["name"]
        print(f"\nProcessing {aid} ({name})...")

        # 1. Athlete row
        db.table("athletes").upsert(
            {
                "id": aid,
                "name": name,
                "bowling_arm": athlete_info["bowling_arm"],
                "guardian_consent": True,
                "dob": athlete_info["dob"],
            }
        ).execute()

        # 2. Baseline rows
        for b in athlete_info["baselines"]:
            db.table("baselines").upsert(
                {
                    "athlete_id": aid,
                    "metric": b["metric"],
                    "fixed_median_deg": b["fixed_median_deg"],
                    "fixed_iqr_deg": b["fixed_iqr_deg"],
                }
            ).execute()

        # 3. Session row
        sid = athlete_info["session_id"]
        db.table("sessions").upsert(
            {
                "id": sid,
                "athlete_id": aid,
                "session_date": today_str,
            }
        ).execute()

        # 4. Deliveries and verdicts
        for d in athlete_info["deliveries"]:
            db.table("deliveries").upsert(
                {
                    "id": d["id"],
                    "session_id": sid,
                    "raw_keypoints": [],
                    "capture_metadata": {
                        "fps": 120.0,
                        "pacing_jitter_pct": 1.5,
                        "distance_meters": 3.0,
                        "tripod_height_meters": 1.1,
                        "camera_roll_deg": 0.1,
                    },
                }
            ).execute()

            db.table("verdicts").upsert(
                {
                    "delivery_id": d["id"],
                    "metric": d["metric"],
                    "status": d["status"],
                    "window_pattern": d["pattern"],
                    "window_matches": d["matches"],
                    "delta_deg": d["delta"],
                    "uncertainty_band_deg": 4.5,
                    "summary": d["summary"],
                    "drill_id": d["drill_id"],
                    "event_frame": 22,
                    "observed_value_deg": d["knee"] if d["metric"] == "front_knee_angle_deg" else d["tilt"],
                    "confidence": 0.95,
                    "trigger_deltas": d["trigger_deltas"],
                    "filtered": True,
                    "trunk_tilt_deg": d["tilt"],
                    "trunk_tilt_confidence": 0.92,
                }
            ).execute()

            if d["drill_id"]:
                print(f"  * {d['id']} -> {d['status']} (drill: {d['drill_id']})")

    print("\nAll showcase bowlers populated successfully!")


if __name__ == "__main__":
    populate_drill_showcase()
