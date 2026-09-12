# Product Requirements Document (PRD) & Technical Specification

**Product Name:** Kinetix Video Coach  
**System Classification:** AI-Assisted Quantitative 2D Biomechanical Review Assistant  
**Target Domain:** Fast Bowling Stride Analysis (Grassroots Cricket)  
**Version:** 7.2 (Production Architecture & AI Context Freeze)  
**Target Hardware:** Commodity Smartphones (Android API 26+ / iOS 15+) & Cloud FastAPI Batch Worker  

---

## 1. System Prompt & Context Mandate (For AI Models)

> **AI INGESTION DIRECTIVE:**  
> Kinetix is a **quantitative 2D video-review assistant** for cricket fast bowling, **NOT** a medical diagnostic tool or an injury prediction engine.  
> 
> **Core System Invariants:**
> 1. **No Medical / Injury Claims:** Never compute "injury probability," "damage risk," or "clinical severity." All flags represent *statistical mechanical deviations* relative to personal baselines.
> 2. **2D Sagittal Plane Only:** Single-camera setups cannot resolve transverse rotation. Only measure in-plane kinematics (Front Knee Angle at FFS, Forward Trunk Tilt at Release).
> 3. **Deterministic Business Logic:** Machine learning models are restricted strictly to coordinate extraction (`[x, y, confidence]`). All biomechanical calculations, event detections, baseline triangulations, and drill selections are deterministic and auditable.
> 4. **Human-in-the-Loop:** Software never autonomously prescribes training to an athlete. The coach must explicitly approve, dismiss, or adjust any flagged mechanical deviation.
> 5. **Fail-Closed Quality Firewall:** If landmark tracking confidence drops below `0.70` or thermal frame drops occur, the system suppresses analysis (`DATA_SUPPRESSED`). Never hallucinate missing joint coordinates.

---

## 2. Strategic Positioning & Epistemic Separation

| Domain | Source of Truth | System Invariant |
| :--- | :--- | :--- |
| **Observed Telemetry** | Raw 2D coordinates `[x, y]`, timestamps `t`, and landmark confidence `$p_i$`. | Extracted via pose model (RTMPose / MediaPipe). Never smoothed before confidence evaluation. |
| **Inferred Mechanical State** | Butterworth-filtered joint angles `theta(t)` and baseline deltas `Delta theta`. | Evaluated deterministically against Fixed Reference Baseline and Rolling 6-Week Median. |
| **Interpreted Coaching Context** | Mechanical flags (`FORM_BENCHMARK`, `MECHANICAL_WATCH`, `TECHNICAL_CONCERN`). | Asserted only if 3 of last 5 valid deliveries exhibit consistent directional deviation. |
| **Actionable Prescription** | Vetted drill schemas from accredited S&C library. | Human coach approval required. Reported pain or medical restrictions override all prompts. |

---

## 3. Physical & Optical Hardware Constraints

1. **Net Lane Clearance Geometry:**
   - **Camera Distance:** Exactly 2.8m to 3.2m perpendicular to the bowling crease (accommodates standard 3.0m–3.5m wide net lanes).
   - **Tripod Height:** Fixed at 1.1m (aligned with athlete hip/pelvis center of mass).
   - **Viewfinder Orientation:** Return crease line locked parallel to in-app horizontal stencil (maximum allowable roll/pitch tilt: < 3.0 deg).
   - **Lens Profile:** Primary wide (0.6x or 1.0x) with pre-calibrated barrel undistortion lookup table (LUT).

2. **Optical & Thermal Ingestion Guardrails:**
   - **Frame Rate:** 60 FPS or 120 FPS high-rate video.
   - **Shutter Velocity:** Hardware exposure locked at <= 1/1000s (natural daylight: 8:00 AM – 4:30 PM).
   - **Hardware Thermal Audit:** Ingestion pipeline validates frame timestamp continuity (`Delta t`). If frame pacing jitter exceeds 8% or dropped frames occur due to thermal throttling, the file is rejected with `ERR_THERMAL_THROTTLE`.
   - **Net Mesh Clearance:** Lens must sit 15cm flush against net netting to eliminate foreground wire occlusion across the front leg.

---

## 4. Decoupled Tri-Layer Architecture

```
[ Smartphone 60/120 FPS Video ]
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: MEASUREMENT ENGINE (Vision & Signal Processing)    │
│  - Hardware Audit: Validate frame pacing (Delta t)          │
│  - Landmark Extraction: RTMDet-nano + RTMPose-s / MediaPipe │
│  - Quality Firewall: Gate if p_knee < 0.70 or p_hip < 0.70  │
│  - Filtering: Zero-phase 4th-order forward-backward filter  │
│  - Event Slicer: Multi-cue FFS & Release detector           │
│  Output: Clean Coordinates [x, y], FFS Frame, Confidence    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: INTERPRETATION ENGINE (Statistical Triangulation)  │
│  - Dual-Baseline Evaluation:                                │
│      * Coach-Confirmed Fixed Reference (Median + IQR)       │
│      * Rolling 6-Week Longitudinal Median                   │
│  - Uncertainty Guard: Flag only if |Delta| > Uncertainty    │
│  - 3-of-5 Rolling Window: Suppress single-ball noise        │
│  Output: Categorical Mechanical Status                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: COACHING ENGINE (Human-in-the-Loop & Actions)      │
│  - Coach Action: [Approve Drill] [Dismiss] [Nudge FFS Frame]│
│  - Audit Logging: Save coach feedback for dataset asset     │
│  - Drill Retrieval: Credentialed S&C library (UKCC L3/BCCI) │
│  - Ephemeral Purge: Delete raw video; export WhatsApp card  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Core Kinematic Metrics Specification

Both candidate metrics are evaluated strictly from a **single side-on sagittal crease view**:

### Metric 1: Front Knee Extension at FFS
* **Vertex:** Knee joint center.
* **Ray 1:** Mid-hip joint center.
* **Ray 2:** Ankle joint center.
* **Temporal Instant:** Front Foot Strike (FFS) frame.
* **Calculation:**
  $$\theta_{\text{knee}} = \arccos\left(\frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}\right) \quad \text{where } \mathbf{u} = \text{Hip} - \text{Knee}, \mathbf{v} = \text{Ankle} - \text{Knee}$$
* **Biomechanical Meaning:** Measures whether the front leg forms a rigid mechanical lever to brake linear momentum and catapult the torso, or flexes to absorb ground impact through muscular load.

### Metric 2: Forward Trunk Tilt at Release
* **Vertex:** Mid-pelvis (midpoint between left and right ASIS/hips).
* **Vector:** Mid-pelvis to mid-shoulder (C7/sternum line).
* **Reference Axis:** Vertical pitch normal `[0, -1]`.
* **Temporal Instant:** Ball release frame (arm extended overhead).
* **Biomechanical Meaning:** Forward inclination of the spine. Detects kinetic chain deceleration efficiency and tracks intra-spell fatigue drift.

---

## 6. Algorithmic Implementation Specifications

### 6.1 Multi-Cue Front Foot Strike (FFS) Detector
Relying solely on ankle velocity zero-crossings produces false positives. The FFS event detector fuses three temporal cues:

$$\text{Score}(t) = w_1 \cdot \mathcal{N}(\dot{y}_{\text{ankle}}(t) \approx 0) + w_2 \cdot \mathcal{N}(y_{\text{ankle}}(t) = y_{\text{ground\_max}}) + w_3 \cdot \mathcal{N}(\ddot{x}_{\text{ankle}}(t) \le T_{\text{decel}})$$

* **Heuristic:** Frame `t` with maximal contact score within a +/-15 frame temporal window around delivery impact is designated `FFS_FRAME`.
* **Coach Nudge:** The UI provides a `[Nudge FFS Frame +/- 1]` slider allowing the coach to override false contact frames.

### 6.2 Dual-Baseline Triangulation & 3-of-5 Rolling Window
```python
def evaluate_delivery_deviation(
    observed_knee_angle: float,
    confidence: float,
    fixed_baseline_median: float,
    fixed_baseline_iqr: float,
    rolling_history: list[float],  # Last 4 valid deliveries
    uncertainty_threshold: float = 3.2
) -> dict:
    if confidence < 0.70:
        return {"status": "DATA_SUPPRESSED", "reason": "Low landmark visibility"}
    
    delta = observed_knee_angle - fixed_baseline_median
    
    # Check if this single delivery is an outlier
    is_outlier = abs(delta) > max(uncertainty_threshold, 1.5 * fixed_baseline_iqr)
    
    if not is_outlier:
        return {"status": "FORM_BENCHMARK", "delta": delta}
    
    # Evaluate 3-of-5 rolling window
    recent_deltas = [d - fixed_baseline_median for d in rolling_history[-4:]] + [delta]
    matching_outliers = sum(1 for d in recent_deltas if (d * delta > 0 and abs(d) > uncertainty_threshold))
    
    if matching_outliers >= 3:
        return {
            "status": "TECHNICAL_CONCERN",
            "delta": delta,
            "window_matches": matching_outliers,
            "action_required": True
        }
    else:
        return {
            "status": "UNCLASSIFIED_DEVIATION",
            "delta": delta,
            "window_matches": matching_outliers,
            "action_required": False
        }
```

---

## 7. Concrete JSON Data Contracts

### 7.1 Delivery Ingestion Payload (`POST /api/v1/sessions/delivery`)
```json
{
  "delivery_id": "DEL-20260912-0042",
  "session_id": "SES-8492048",
  "athlete_id": "ATH-1092",
  "capture_metadata": {
    "fps": 120,
    "pacing_jitter_pct": 2.1,
    "shutter_speed_sec": 0.001,
    "distance_meters": 3.0,
    "tripod_height_meters": 1.1,
    "camera_roll_deg": 1.2
  },
  "raw_keypoints": [
    {
      "frame": 73,
      "t_ms": 608.3,
      "knee": {"x": 842.1, "y": 1420.5, "conf": 0.94},
      "hip": {"x": 820.3, "y": 1040.2, "conf": 0.96},
      "ankle": {"x": 860.8, "y": 1780.0, "conf": 0.92}
    }
  ]
}
```

### 7.2 Kinematic Evaluation & Coaching Card (`GET /api/v1/reports/{delivery_id}`)
```json
{
  "report_id": "RPT-9382104",
  "delivery_id": "DEL-20260912-0042",
  "evaluation_timestamp": "2026-09-12T10:15:32Z",
  "kinematics": {
    "ffs_frame": 73,
    "front_knee_angle_deg": 134.0,
    "front_knee_confidence": 0.94,
    "forward_trunk_tilt_deg": 18.5,
    "trunk_tilt_confidence": 0.91
  },
  "baselines": {
    "fixed_reference_median_deg": 148.0,
    "fixed_reference_iqr_deg": 3.5,
    "rolling_6wk_median_deg": 145.0,
    "delta_deg": -14.0,
    "uncertainty_band_deg": 3.2
  },
  "verdict": {
    "status": "TECHNICAL_CONCERN",
    "window_pattern": "3_OF_5_MATCHED",
    "summary": "Persistent front-knee flexion deviation detected under ground impact.",
    "clinical_disclaimer": "Non-diagnostic coaching metric. Reported athlete pain strictly voids prompts."
  },
  "proposed_action": {
    "drill_id": "DRL-SNC-012",
    "title": "Step-Down Landing Holds",
    "prescription": "3 sets x 6 reps off 12-inch box focusing on isometric extension.",
    "contraindications": ["patellar_tendon_pain", "acute_knee_swelling"],
    "credential": "UKCC Level 3 S&C Standard"
  }
}
```

---

## 8. State Machine & Human-in-the-Loop Override

```
                 [ Video Ingested ]
                         │
                         ▼
               { Quality Firewall }
              /                   \
    (Fail: p < 0.70)          (Pass: p >= 0.70)
            │                           │
            ▼                           ▼
    [ DATA_SUPPRESSED ]         [ Evaluate Delta ]
                                        │
                         { 3-of-5 Rolling Window? }
                        /                          \
             (Count < 3)                            (Count >= 3)
                  │                                      │
                  ▼                                      ▼
      [ UNCLASSIFIED_DEVIATION ]                [ TECHNICAL_CONCERN ]
      (Replay Yellow Flag Only)                          │
                                                         ▼
                                                { Coach Action Menu }
                                               /         │         \
                                              ▼          ▼          ▼
                                          [Approve]  [Dismiss]  [Nudge FFS]
```

---

## 9. Measurable SLAs & Stage 1 Validation Targets

| Metric / Parameter | Performance SLA & Validation Target | Verification Protocol |
| :--- | :--- | :--- |
| **Field Setup SLA** | Setup & Stencil Lock <= 30 seconds | Coach mounts phone and locks crease stencil at outdoor nets. |
| **Ingestion Latency** | P50 <= 8s, P95 <= 15s per delivery | Processing over standard 4G/5G mobile connection. |
| **Thermal Protection** | Frame pacing jitter <= 8% | Hardware timestamp audit; rejects throttled clips. |
| **FFS Temporal Accuracy** | <= 33ms (60 FPS) / <= 17ms (120 FPS) | Multi-cue detector compared to manual biomechanist ground truth. |
| **Knee Angle MAE** | MAE <= 4.0 deg | Evaluated on 6 held-out unseen bowlers against Kinovea annotations. |
| **Trunk Tilt MAE** | MAE <= 3.5 deg | Evaluated on 6 held-out unseen bowlers against Kinovea annotations. |
| **Decision Concordance**| Concordance > 80% | Agreement between Kinetix status and accredited coach classification. |
| **False Burden** | Coach Dismissal Rate < 25% | Percentage of flags dismissed across 30 consecutive deliveries. |

---

## 10. Governance, Consent & Minor Privacy

1. **Adolescent Consent Gate:** Digital parental/guardian consent is mandatory prior to registering athletes under 18 years of age.
2. **Ephemeral Video Pipeline:** Raw MP4 video files are processed in volatile memory and purged immediately following coordinate extraction. Only numerical arrays `[x, y, p_i, t]` are stored in persistent databases.
3. **Private WhatsApp Communication:** Exported summary cards contain only validated joint angles, baseline charts, and approved drill text. Raw video files are never transmitted or hosted on public URLs.
