"""Populates the database with realistic cricket academy athletes, sessions,
confirmed baselines, and evaluated deliveries with verdicts.

Safe to re-run: uses upsert and checks existing delivery IDs.
Run with: python scripts/populate_more_athletes.py
"""

from datetime import datetime, timezone
from src.db.client import get_supabase

ATHLETES = [
    {
        "id": "ATH-DEMO-02",
        "name": "James Anderson",
        "bowling_arm": "RIGHT",
        "guardian_consent": True,
        "dob": "1998-07-30",
        "baseline": {"median_deg": 164.0, "iqr_deg": 2.6},
        "session": {"id": "SES-DEMO-02", "date": "2026-09-08"},
        "deliveries": [
            {
                "id": "DEL-JA-01",
                "delta": 0.4,
                "knee": 164.4,
                "tilt": 28.2,
                "status": "FORM_BENCHMARK",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Front knee angle within baseline tolerance.",
                "drill_id": None,
            },
            {
                "id": "DEL-JA-02",
                "delta": -0.8,
                "knee": 163.2,
                "tilt": 29.0,
                "status": "FORM_BENCHMARK",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Front knee angle within baseline tolerance.",
                "drill_id": None,
            },
            {
                "id": "DEL-JA-03",
                "delta": 0.2,
                "knee": 164.2,
                "tilt": 28.5,
                "status": "FORM_BENCHMARK",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Front knee angle within baseline tolerance.",
                "drill_id": None,
            },
            {
                "id": "DEL-JA-04",
                "delta": -0.5,
                "knee": 163.5,
                "tilt": 29.1,
                "status": "FORM_BENCHMARK",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Front knee angle within baseline tolerance.",
                "drill_id": None,
            },
        ],
    },
    {
        "id": "ATH-DEMO-03",
        "name": "Shaheen Afridi",
        "bowling_arm": "LEFT",
        "guardian_consent": True,
        "dob": "2000-04-06",
        "baseline": {"median_deg": 156.0, "iqr_deg": 3.2},
        "session": {"id": "SES-DEMO-03", "date": "2026-09-10"},
        "deliveries": [
            {
                "id": "DEL-SA-01",
                "delta": -0.6,
                "knee": 155.4,
                "tilt": 31.0,
                "status": "FORM_BENCHMARK",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Front knee angle within baseline tolerance.",
                "drill_id": None,
            },
            {
                "id": "DEL-SA-02",
                "delta": 1.1,
                "knee": 157.1,
                "tilt": 30.5,
                "status": "FORM_BENCHMARK",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Front knee angle within baseline tolerance.",
                "drill_id": None,
            },
            {
                "id": "DEL-SA-03",
                "delta": -5.4,
                "knee": 150.6,
                "tilt": 34.2,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 1,
                "summary": "Front knee angle deviated 5.4° below confirmed baseline.",
                "drill_id": None,
            },
            {
                "id": "DEL-SA-04",
                "delta": -6.1,
                "knee": 149.9,
                "tilt": 35.0,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 2,
                "summary": "Front knee angle deviated 6.1° below confirmed baseline.",
                "drill_id": None,
            },
        ],
    },
    {
        "id": "ATH-DEMO-04",
        "name": "Aarav Patel",
        "bowling_arm": "RIGHT",
        "guardian_consent": True,
        "dob": "2008-11-15",
        "baseline": {"median_deg": 149.0, "iqr_deg": 3.0},
        "session": {"id": "SES-DEMO-04", "date": "2026-09-12"},
        "deliveries": [
            {
                "id": "DEL-AP-01",
                "delta": -1.2,
                "knee": 147.8,
                "tilt": 27.5,
                "status": "FORM_BENCHMARK",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Front knee angle within baseline tolerance.",
                "drill_id": None,
            },
            {
                "id": "DEL-AP-02",
                "delta": -7.8,
                "knee": 141.2,
                "tilt": 32.0,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 1,
                "summary": "Front knee angle collapsed 7.8° below baseline.",
                "drill_id": None,
            },
            {
                "id": "DEL-AP-03",
                "delta": -8.5,
                "knee": 140.5,
                "tilt": 33.1,
                "status": "MECHANICAL_WATCH",
                "pattern": "ISOLATED",
                "matches": 2,
                "summary": "Front knee angle collapsed 8.5° below baseline.",
                "drill_id": None,
            },
            {
                "id": "DEL-AP-04",
                "delta": -9.2,
                "knee": 139.8,
                "tilt": 34.0,
                "status": "TECHNICAL_CONCERN",
                "pattern": "3_OF_5_MATCHED",
                "matches": 3,
                "summary": "Front knee angle deviation confirmed across 3 of the last 5 deliveries.",
                "drill_id": "DRL-SNC-012",
            },
        ],
    },
    {
        "id": "ATH-DEMO-05",
        "name": "Sam Curran",
        "bowling_arm": "LEFT",
        "guardian_consent": False,
        "dob": "2009-06-03",
        "baseline": None,
        "session": {"id": "SES-DEMO-05", "date": "2026-09-13"},
        "deliveries": [
            {
                "id": "DEL-SC-01",
                "delta": None,
                "knee": 145.0,
                "tilt": 26.0,
                "status": "BENCHMARK_PENDING",
                "pattern": "NOT_APPLICABLE",
                "matches": 0,
                "summary": "Delivery measured, but athlete baseline is pending confirmation.",
                "drill_id": None,
            },
        ],
    },
]


def populate() -> None:
    db = get_supabase()
    now_iso = datetime.now(timezone.utc).isoformat()

    for item in ATHLETES:
        print(f"Populating athlete: {item['name']} ({item['id']})...")

        # 1. Upsert athlete
        db.table("athletes").upsert(
            {
                "id": item["id"],
                "name": item["name"],
                "bowling_arm": item["bowling_arm"],
                "guardian_consent": item["guardian_consent"],
                "dob": item["dob"],
            }
        ).execute()

        # 2. Upsert baseline if present
        if item["baseline"]:
            db.table("baselines").upsert(
                {
                    "athlete_id": item["id"],
                    "metric": "front_knee_angle_deg",
                    "fixed_median_deg": item["baseline"]["median_deg"],
                    "fixed_iqr_deg": item["baseline"]["iqr_deg"],
                }
            ).execute()

        # 3. Upsert session
        sess = item["session"]
        db.table("sessions").upsert(
            {
                "id": sess["id"],
                "athlete_id": item["id"],
                "session_date": sess["date"],
            }
        ).execute()

        # 4. Upsert deliveries & verdicts
        for d in item["deliveries"]:
            # Delivery row
            db.table("deliveries").upsert(
                {
                    "id": d["id"],
                    "session_id": sess["id"],
                    "raw_keypoints": [],
                    "capture_metadata": {
                        "fps": 120.0,
                        "pacing_jitter_pct": 2.1,
                        "distance_meters": 3.0,
                        "tripod_height_meters": 1.1,
                        "camera_roll_deg": 0.4,
                    },
                }
            ).execute()

            # Verdict row
            band = item["baseline"]["iqr_deg"] * 1.5 if item["baseline"] else None
            db.table("verdicts").upsert(
                {
                    "delivery_id": d["id"],
                    "metric": "front_knee_angle_deg",
                    "status": d["status"],
                    "window_pattern": d["pattern"],
                    "window_matches": d["matches"],
                    "delta_deg": d["delta"],
                    "uncertainty_band_deg": band,
                    "summary": d["summary"],
                    "drill_id": d["drill_id"],
                    "event_frame": 20,
                    "observed_value_deg": d["knee"],
                    "confidence": 0.94,
                    "trigger_deltas": [-7.8, -8.5, -9.2] if d["matches"] >= 3 else None,
                    "filtered": True,
                    "trunk_tilt_deg": d["tilt"],
                    "trunk_tilt_confidence": 0.91,
                }
            ).execute()

    print("Successfully populated 4 additional athletes, sessions, and deliveries!")


if __name__ == "__main__":
    populate()
