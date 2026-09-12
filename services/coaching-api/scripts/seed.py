"""Seeds reference data only: one demo athlete, session, confirmed
baseline, and the one drill used in the demo. Does NOT create deliveries -
those are produced by actually running them through the pipeline (see
scripts/demo_walkthrough.py), since a delivery only becomes meaningful once
it's been measured/interpreted and produces a verdict.

An earlier version of this script wrote single-frame deliveries directly
into the deliveries table. That was wrong on two counts: detect_ffs_frame
requires at least 3 frames (would raise ValueError), and writing straight
into the table bypasses the pipeline entirely, so no verdict would ever get
created. See BACKEND_PLAN.md Milestone 6.

Run with: PYTHONPATH=. python scripts/seed.py
Safe to re-run: uses upsert, so it won't create duplicate rows.
"""

from scripts.demo_fixtures import ATHLETE_ID, BASELINE_IQR_DEG, BASELINE_MEDIAN_DEG, SESSION_ID
from src.db.client import get_supabase


def main() -> None:
    db = get_supabase()

    db.table("athletes").upsert(
        {"id": ATHLETE_ID, "name": "Demo Bowler", "guardian_consent": True}
    ).execute()

    db.table("sessions").upsert(
        {"id": SESSION_ID, "athlete_id": ATHLETE_ID, "session_date": "2026-09-01"}
    ).execute()

    # Clear previous demo deliveries for this session so re-running seed provides a clean slate
    db.table("deliveries").delete().eq("session_id", SESSION_ID).execute()

    db.table("baselines").upsert(
        {
            "athlete_id": ATHLETE_ID,
            "metric": "front_knee_angle_deg",
            "fixed_median_deg": BASELINE_MEDIAN_DEG,
            "fixed_iqr_deg": BASELINE_IQR_DEG,
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

    print(f"Seeded reference data for athlete {ATHLETE_ID}, session {SESSION_ID}.")
    print("Run scripts/demo_walkthrough.py against a running server to create deliveries.")


if __name__ == "__main__":
    main()
