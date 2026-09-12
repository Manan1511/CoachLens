"""Populate an explicitly flagged bowler in the Supabase database."""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.coaching.repository import get_supabase


def populate_flagged_bowler():
    db = get_supabase()
    today_str = date.today().isoformat()

    athlete_id = "ATH-DEMO-06"
    session_id = "SES-DEMO-06"

    print(f"Upserting flagged bowler {athlete_id} (Mark Wood)...")

    # 1. Athlete row
    db.table("athletes").upsert(
        {
            "id": athlete_id,
            "name": "Mark Wood",
            "bowling_arm": "RIGHT",
            "guardian_consent": True,
            "dob": "1995-01-11",
        }
    ).execute()

    # 2. Baseline row
    db.table("baselines").upsert(
        {
            "athlete_id": athlete_id,
            "metric": "front_knee_angle_deg",
            "fixed_median_deg": 158.5,
            "fixed_iqr_deg": 3.2,
        }
    ).execute()

    # 3. Session row for today
    db.table("sessions").upsert(
        {
            "id": session_id,
            "athlete_id": athlete_id,
            "session_date": today_str,
        }
    ).execute()

    # 4. Deliveries and verdicts
    deliveries = [
        {
            "id": "DEL-MW-01",
            "delta": -0.5,
            "knee": 158.0,
            "tilt": 28.0,
            "status": "FORM_BENCHMARK",
            "pattern": "NOT_APPLICABLE",
            "matches": 0,
            "summary": "Front knee angle within baseline tolerance.",
            "drill_id": None,
        },
        {
            "id": "DEL-MW-02",
            "delta": -9.3,
            "knee": 149.2,
            "tilt": 33.5,
            "status": "MECHANICAL_WATCH",
            "pattern": "ISOLATED",
            "matches": 1,
            "summary": "Front knee angle collapsed 9.3° below confirmed baseline.",
            "drill_id": None,
        },
        {
            "id": "DEL-MW-03",
            "delta": -10.5,
            "knee": 148.0,
            "tilt": 34.0,
            "status": "MECHANICAL_WATCH",
            "pattern": "ISOLATED",
            "matches": 2,
            "summary": "Front knee angle collapsed 10.5° below confirmed baseline.",
            "drill_id": None,
        },
        {
            "id": "DEL-MW-04",
            "delta": -11.0,
            "knee": 147.5,
            "tilt": 34.8,
            "status": "TECHNICAL_CONCERN",
            "pattern": "3_OF_5_MATCHED",
            "matches": 3,
            "summary": "Front knee angle deviation confirmed across 3 of the last 5 deliveries. Flagged for coach review.",
            "drill_id": "DRL-SNC-012",
        },
    ]

    for d in deliveries:
        # Delivery row
        db.table("deliveries").upsert(
            {
                "id": d["id"],
                "session_id": session_id,
                "raw_keypoints": [],
                "capture_metadata": {
                    "fps": 120.0,
                    "pacing_jitter_pct": 1.8,
                    "distance_meters": 3.0,
                    "tripod_height_meters": 1.1,
                    "camera_roll_deg": 0.2,
                },
            }
        ).execute()

        # Verdict row
        db.table("verdicts").upsert(
            {
                "delivery_id": d["id"],
                "metric": "front_knee_angle_deg",
                "status": d["status"],
                "window_pattern": d["pattern"],
                "window_matches": d["matches"],
                "delta_deg": d["delta"],
                "uncertainty_band_deg": 4.8,
                "summary": d["summary"],
                "drill_id": d["drill_id"],
                "event_frame": 22,
                "observed_value_deg": d["knee"],
                "confidence": 0.95,
                "trigger_deltas": [-9.3, -10.5, -11.0] if d["matches"] >= 3 else None,
                "filtered": True,
                "trunk_tilt_deg": d["tilt"],
                "trunk_tilt_confidence": 0.92,
            }
        ).execute()

    print(f"Successfully populated flagged bowler {athlete_id} (Mark Wood) with 4 deliveries, ending in TECHNICAL_CONCERN (DEL-MW-04).")


if __name__ == "__main__":
    populate_flagged_bowler()
