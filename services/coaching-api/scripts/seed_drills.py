"""Seeds credentialed S&C drill library in Supabase Postgres."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.coaching.repository import get_supabase

DRILLS = [
    {
        "id": "DRL-SNC-012",
        "title": "Step-Down Landing Holds",
        "prescription": "3 sets x 6 reps off 12-inch box focusing on isometric extension.",
        "contraindications": ["patellar_tendon_pain", "acute_knee_swelling"],
        "credential": "UKCC Level 3 S&C Standard",
    },
    {
        "id": "DRL-KNE-015",
        "title": "Single-Leg Deceleration Catch Drops",
        "prescription": "3 sets x 8 reps: drop from 6-inch step into controlled 15-20° flexion absorb, maintaining neutral shin angle.",
        "contraindications": ["acute_hamstring_strain", "knee_meniscal_irritation"],
        "credential": "ECB Fast Bowling Directive (Module 4)",
    },
    {
        "id": "DRL-TRK-004",
        "title": "Tall-Spine Cable Anti-Flexion Holds",
        "prescription": "3 sets x 30s holds in stride stance with overhead resistance band to reinforce thoracic extension at release.",
        "contraindications": ["lumbar_pars_stress", "acute_facet_joint_pain"],
        "credential": "BCCI High Performance Fast Bowling Syllabus (Level 2)",
    },
    {
        "id": "DRL-TRK-007",
        "title": "Harness Tow Bowler Pull-Throughs",
        "prescription": "4 sets x 5 deliveries with light resistance band at hip to train forward momentum transfer through the crease.",
        "contraindications": ["groin_adductor_strain", "lumbar_disc_herniation"],
        "credential": "UKCC Fast Bowling Performance Framework",
    },
    {
        "id": "DRL-PLY-008",
        "title": "Bound-to-Stick Stride Decelerations",
        "prescription": "3 sets x 5 reps bounding into stiff front-foot landing hold with 2-second stabilization check.",
        "contraindications": ["plantar_fasciitis", "shin_splints"],
        "credential": "Cricket Australia Pace Bowling Mechanics Standard",
    },
]


def seed_drills():
    db = get_supabase()
    print(f"Seeding {len(DRILLS)} credentialed drills into Supabase...")
    for drill in DRILLS:
        db.table("drills").upsert(drill).execute()
        print(f"  * {drill['id']}: {drill['title']} ({drill['credential']})")
    print("Done! All drills seeded successfully.")


if __name__ == "__main__":
    seed_drills()
