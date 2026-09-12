"""Seed one demo athlete with a confirmed baseline and a delivery history
that reproduces the full status range for the hackathon demo path:

  FORM_BENCHMARK -> MECHANICAL_WATCH (isolated) -> TECHNICAL_CONCERN (3-of-5)
  -> DATA_SUPPRESSED (occluded/low-confidence)

Run with: PYTHONPATH=. python scripts/seed.py
Safe to re-run: uses upsert, so it won't create duplicate rows.
"""

from src.db.client import get_supabase

ATHLETE_ID = "ATH-DEMO-01"
SESSION_ID = "SES-DEMO-01"


def make_delivery(delivery_id: str, knee_conf: float, knee_x_offset: float) -> dict:
    """Builds a minimal single-frame delivery. Only the FFS frame matters for
    the demo pipeline, so we don't simulate a full stride sequence here."""
    return {
        "id": delivery_id,
        "session_id": SESSION_ID,
        "raw_keypoints": [
            {
                "frame": 73,
                "t_ms": 608.3,
                "knee": {"x": 842.1 + knee_x_offset, "y": 1420.5, "conf": knee_conf},
                "hip": {"x": 820.3, "y": 1040.2, "conf": 0.96},
                "ankle": {"x": 860.8, "y": 1780.0, "conf": 0.92},
            }
        ],
        "capture_metadata": {
            "fps": 120,
            "pacing_jitter_pct": 2.1,
            "shutter_speed_sec": 0.001,
            "distance_meters": 3.0,
            "tripod_height_meters": 1.1,
            "camera_roll_deg": 1.2,
        },
    }


def main() -> None:
    db = get_supabase()

    db.table("athletes").upsert(
        {
            "id": ATHLETE_ID,
            "name": "Demo Bowler",
            "guardian_consent": True,
        }
    ).execute()

    db.table("sessions").upsert(
        {
            "id": SESSION_ID,
            "athlete_id": ATHLETE_ID,
            "session_date": "2026-09-01",
        }
    ).execute()

    db.table("baselines").upsert(
        {
            "athlete_id": ATHLETE_ID,
            "metric": "front_knee_angle_deg",
            "fixed_median_deg": 148.0,
            "fixed_iqr_deg": 3.5,
        }
    ).execute()

    db.table("drills").upsert(
        {
            "id": "DRL-SNC-012",
            "title": "Step-Down Landing Holds",
            "prescription": "3 sets x 6 reps off 12-inch box focusing on isometric extension.",
            "contraindications": ["patellar_tendon_pain", "acute_knee_swelling"],
            "credential": "UKCC Level 3 S&C Standard",
        }
    ).execute()

    deliveries = [
        make_delivery("DEL-DEMO-01", knee_conf=0.95, knee_x_offset=0),
        make_delivery("DEL-DEMO-02", knee_conf=0.94, knee_x_offset=-15),
        make_delivery("DEL-DEMO-03", knee_conf=0.93, knee_x_offset=-30),
        make_delivery("DEL-DEMO-04", knee_conf=0.94, knee_x_offset=-32),
        make_delivery("DEL-DEMO-05", knee_conf=0.30, knee_x_offset=0),
    ]
    for delivery in deliveries:
        db.table("deliveries").upsert(delivery).execute()

    print(f"Seeded athlete {ATHLETE_ID}, session {SESSION_ID}, {len(deliveries)} deliveries.")


if __name__ == "__main__":
    main()
