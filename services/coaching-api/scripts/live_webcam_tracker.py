"""Live webcam pose tracker & CoachLens delivery evaluator.

Opens your webcam, tracks bowler biomechanics in real-time via MediaPipe,
computes live joint angles on screen, and allows recording a delivery to send
directly to the CoachLens API for instant analysis.

Controls:
  [SPACE] - Start / Stop recording a delivery (sends to API automatically)
  [q]     - Quit

Run with:
  PYTHONPATH=. .venv\Scripts\python scripts/live_webcam_tracker.py
"""

import math
import os
import sys
import time
import uuid

import cv2
import httpx
import mediapipe as mp

from scripts.demo_fixtures import ATHLETE_ID, SESSION_ID
from scripts.demo_walkthrough import get_demo_coach_token

DEFAULT_API_URL = os.environ.get("COACHLENS_API_URL", "https://coachlens-xvh3.onrender.com")


def calculate_angle(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> float:
    """Calculates angle at vertex b given points a, b, c."""
    v1 = (a[0] - b[0], a[1] - b[1])
    v2 = (c[0] - b[0], c[1] - b[1])
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    mag1 = math.hypot(*v1)
    mag2 = math.hypot(*v2)
    if mag1 == 0 or mag2 == 0:
        return 0.0
    cos_theta = max(-1.0, min(1.0, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cos_theta))


def calculate_trunk_tilt(hip: tuple[float, float], shoulder: tuple[float, float]) -> float:
    """Calculates trunk tilt relative to vertical axis [0, -1]."""
    v = (shoulder[0] - hip[0], shoulder[1] - hip[1])
    dot = v[0] * 0.0 + v[1] * -1.0
    mag = math.hypot(*v)
    if mag == 0:
        return 0.0
    cos_theta = max(-1.0, min(1.0, dot / mag))
    return math.degrees(math.acos(cos_theta))


def main() -> None:
    api_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_API_URL
    print(f"Target CoachLens API: {api_url}")
    print("Authenticating demo coach...")
    token = ""
    for attempt in range(1, 4):
        try:
            token = get_demo_coach_token()
            print("Coach authenticated successfully!")
            break
        except Exception as e:
            print(f"Auth attempt {attempt}/3 failed ({e}). Retrying in 1s...")
            time.sleep(1.0)
    if not token:
        print("Warning: could not authenticate after retries. Proceeding in offline preview mode.")

    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles

    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print("\n=== CoachLens Live Camera Tracker Active ===")
    print("Press [SPACE] to start recording a delivery (press [SPACE] again to stop and evaluate)")
    print("Press [q] to exit\n")

    is_recording = False
    recorded_frames = []
    record_start_time = 0.0
    last_verdict = None
    frame_counter = 0

    fps_last_time = time.time()
    fps_display = 0.0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Flip horizontally for natural mirror feel
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)

        curr_time = time.time()
        frame_counter += 1
        if curr_time - fps_last_time >= 1.0:
            fps_display = frame_counter / (curr_time - fps_last_time)
            frame_counter = 0
            fps_last_time = curr_time

        knee_angle_text = "N/A"
        trunk_tilt_text = "N/A"
        firewall_status = "No Pose"
        status_color = (128, 128, 128)

        if results.pose_landmarks:
            mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style(),
            )

            lm = results.pose_landmarks.landmark
            # Use right side (can be mirrored or switched)
            r_hip = lm[mp_pose.PoseLandmark.RIGHT_HIP.value]
            r_knee = lm[mp_pose.PoseLandmark.RIGHT_KNEE.value]
            r_ankle = lm[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
            r_shoulder = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            r_wrist = lm[mp_pose.PoseLandmark.RIGHT_WRIST.value]

            # Convert to pixel coords
            hip_pt = (r_hip.x * w, r_hip.y * h)
            knee_pt = (r_knee.x * w, r_knee.y * h)
            ankle_pt = (r_ankle.x * w, r_ankle.y * h)
            shoulder_pt = (r_shoulder.x * w, r_shoulder.y * h)
            wrist_pt = (r_wrist.x * w, r_wrist.y * h)

            # Compute live angles
            k_angle = calculate_angle(hip_pt, knee_pt, ankle_pt)
            t_tilt = calculate_trunk_tilt(hip_pt, shoulder_pt)

            knee_angle_text = f"{k_angle:.1f} deg"
            trunk_tilt_text = f"{t_tilt:.1f} deg"

            # Quality firewall: knee & hip conf >= 0.70
            passes_firewall = r_knee.visibility >= 0.70 and r_hip.visibility >= 0.70
            firewall_status = "FIREWALL PASS (conf > 0.70)" if passes_firewall else "CONFIDENCE LOW (< 0.70)"
            status_color = (0, 255, 0) if passes_firewall else (0, 140, 255)

            # If recording, append keypoint frame
            if is_recording:
                t_ms = (curr_time - record_start_time) * 1000.0
                recorded_frames.append({
                    "frame": len(recorded_frames),
                    "t_ms": t_ms,
                    "hip": {"x": hip_pt[0], "y": hip_pt[1], "conf": r_hip.visibility},
                    "knee": {"x": knee_pt[0], "y": knee_pt[1], "conf": r_knee.visibility},
                    "ankle": {"x": ankle_pt[0], "y": ankle_pt[1], "conf": r_ankle.visibility},
                    "shoulder": {"x": shoulder_pt[0], "y": shoulder_pt[1], "conf": r_shoulder.visibility},
                    "wrist": {"x": wrist_pt[0], "y": wrist_pt[1], "conf": r_wrist.visibility},
                })

        # --- UI Overlay ---
        # Header banner
        cv2.rectangle(frame, (0, 0), (w, 90), (20, 20, 20), -1)
        cv2.putText(frame, "CoachLens Live Biomechanics Review", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
        cv2.putText(frame, f"FPS: {fps_display:.1f}  |  Knee Angle: {knee_angle_text}  |  Trunk Tilt: {trunk_tilt_text}", (20, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 255), 1)
        cv2.putText(frame, f"Quality: {firewall_status}", (20, 78), cv2.FONT_HERSHEY_SIMPLEX, 0.50, status_color, 1)

        # Recording banner
        if is_recording:
            elapsed = curr_time - record_start_time
            cv2.rectangle(frame, (w - 240, 20), (w - 20, 70), (0, 0, 180), -1)
            cv2.circle(frame, (w - 215, 45), 10, (0, 0, 255), -1)
            cv2.putText(frame, f"REC {elapsed:.1f}s ({len(recorded_frames)}f)", (w - 195, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

        # Bottom banner for verdicts / instructions
        cv2.rectangle(frame, (0, h - 70), (w, h), (20, 20, 20), -1)
        if last_verdict:
            status_text = f"Last Verdict: {last_verdict.get('status')} | Summary: {last_verdict.get('summary')}"
            cv2.putText(frame, status_text, (20, h - 45), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 200), 2)
            drill = last_verdict.get("drill")
            if drill:
                cv2.putText(frame, f"Assigned Drill: {drill}", (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (255, 200, 0), 1)
        else:
            cv2.putText(frame, "Press [SPACE] to record a delivery  |  Press [q] to quit", (20, h - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.60, (200, 200, 200), 1)

        cv2.imshow("CoachLens Live Camera Tracker", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord("q"):
            break
        elif key == 32:  # SPACEBAR
            if not is_recording:
                # Start recording
                is_recording = True
                recorded_frames = []
                record_start_time = time.time()
                last_verdict = None
                print("[RECORDING STARTED] Perform your delivery stride...")
            else:
                # Stop recording & evaluate
                is_recording = False
                print(f"[RECORDING STOPPED] Captured {len(recorded_frames)} frames.")
                if len(recorded_frames) < 5:
                    print("Too few frames captured (< 5). Please record for at least 1 second.")
                    continue

                delivery_id = f"DEL-CAM-{uuid.uuid4().hex[:6].upper()}"
                duration_s = time.time() - record_start_time
                fps_calc = max(15, int(len(recorded_frames) / max(0.1, duration_s)))

                payload = {
                    "delivery_id": delivery_id,
                    "session_id": SESSION_ID,
                    "athlete_id": ATHLETE_ID,
                    "capture_metadata": {
                        "fps": fps_calc,
                        "video_duration_s": duration_s,
                        "pacing_jitter_pct": 1.5,
                    },
                    "raw_keypoints": recorded_frames,
                }

                print(f"Sending {delivery_id} ({len(recorded_frames)} frames) to CoachLens API at {api_url}...")
                try:
                    headers = {"Authorization": f"Bearer {token}"} if token else {}
                    with httpx.Client(base_url=api_url, timeout=30.0, headers=headers) as client:
                        resp = client.post("/api/v1/sessions/delivery", json=payload)
                    if resp.status_code == 200:
                        report = resp.json()
                        verdict = report.get("verdict", {})
                        proposed = report.get("proposed_action")
                        drill_title = proposed.get("title") if proposed else None
                        last_verdict = {
                            "status": verdict.get("status"),
                            "summary": verdict.get("summary"),
                            "drill": drill_title,
                        }
                        print(f"\\n[COACHLENS REPORT for {delivery_id}]")
                        print(f"Status: {verdict.get('status')}")
                        print(f"Summary: {verdict.get('summary')}")
                        print(f"Knee Angle: {report.get('kinematics', {}).get('front_knee_angle_deg')} deg")
                        print(f"Trunk Tilt: {report.get('kinematics', {}).get('forward_trunk_tilt_deg')} deg")
                        if drill_title:
                            print(f"Prescribed Drill: {drill_title}")
                        print()
                    else:
                        print(f"API Error: HTTP {resp.status_code} - {resp.text}")
                except Exception as exc:
                    print(f"Network error connecting to API: {exc}")

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
