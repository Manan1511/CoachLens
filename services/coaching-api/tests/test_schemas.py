from src.schemas.delivery import DeliveryIngestionRequest
from src.schemas.report import CoachingReport

PRD_DELIVERY_PAYLOAD = {
    "delivery_id": "DEL-20260912-0042",
    "session_id": "SES-8492048",
    "athlete_id": "ATH-1092",
    "capture_metadata": {
        "fps": 120,
        "pacing_jitter_pct": 2.1,
        "shutter_speed_sec": 0.001,
        "distance_meters": 3.0,
        "tripod_height_meters": 1.1,
        "camera_roll_deg": 1.2,
    },
    "raw_keypoints": [
        {
            "frame": 73,
            "t_ms": 608.3,
            "knee": {"x": 842.1, "y": 1420.5, "conf": 0.94},
            "hip": {"x": 820.3, "y": 1040.2, "conf": 0.96},
            "ankle": {"x": 860.8, "y": 1780.0, "conf": 0.92},
        }
    ],
}

PRD_REPORT_PAYLOAD = {
    "report_id": "RPT-9382104",
    "delivery_id": "DEL-20260912-0042",
    "evaluation_timestamp": "2026-09-12T10:15:32Z",
    "kinematics": {
        "ffs_frame": 73,
        "front_knee_angle_deg": 134.0,
        "front_knee_confidence": 0.94,
        "forward_trunk_tilt_deg": 18.5,
        "trunk_tilt_confidence": 0.91,
    },
    "baselines": {
        "fixed_reference_median_deg": 148.0,
        "fixed_reference_iqr_deg": 3.5,
        "rolling_6wk_median_deg": 145.0,
        "delta_deg": -14.0,
        "uncertainty_band_deg": 3.2,
    },
    "verdict": {
        "status": "TECHNICAL_CONCERN",
        "window_pattern": "3_OF_5_MATCHED",
        "window_matches": 3,
        "summary": "Persistent front-knee flexion deviation detected under ground impact.",
        "clinical_disclaimer": "Non-diagnostic coaching metric. Reported athlete pain strictly voids prompts.",
    },
    "proposed_action": {
        "drill_id": "DRL-SNC-012",
        "title": "Step-Down Landing Holds",
        "prescription": "3 sets x 6 reps off 12-inch box focusing on isometric extension.",
        "contraindications": ["patellar_tendon_pain", "acute_knee_swelling"],
        "credential": "UKCC Level 3 S&C Standard",
    },
}


def test_delivery_ingestion_payload_matches_prd_example():
    req = DeliveryIngestionRequest.model_validate(PRD_DELIVERY_PAYLOAD)
    assert req.delivery_id == "DEL-20260912-0042"
    assert req.raw_keypoints[0].knee.conf == 0.94
    assert req.raw_keypoints[0].shoulder is None


def test_coaching_report_matches_prd_example():
    report = CoachingReport.model_validate(PRD_REPORT_PAYLOAD)
    assert report.verdict.status == "TECHNICAL_CONCERN"
    assert report.proposed_action.drill_id == "DRL-SNC-012"


def test_coaching_report_allows_null_rolling_baseline():
    payload = dict(PRD_REPORT_PAYLOAD)
    payload["baselines"] = dict(payload["baselines"], rolling_6wk_median_deg=None)
    payload["proposed_action"] = None
    report = CoachingReport.model_validate(payload)
    assert report.baselines.rolling_6wk_median_deg is None
    assert report.proposed_action is None
