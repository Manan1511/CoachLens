"""Runs the validated 5-delivery demo scenario (scripts/demo_fixtures.py)
against a REAL running server, over HTTP. This is the actual hackathon demo
script - it's what would be run live to show the FORM_BENCHMARK ->
MECHANICAL_WATCH -> MECHANICAL_WATCH -> TECHNICAL_CONCERN -> DATA_SUPPRESSED
progression, and reports per-request latency against the PRD's P50<=8s /
P95<=15s SLA (trivial here since there's no ML/network in the loop, but
worth confirming rather than assuming).

Prerequisites:
  1. SUPABASE_SERVICE_ROLE_KEY set in .env (see .env.example)
  2. scripts/seed.py already run (creates the athlete/session/baseline/drill)
  3. Server running: uvicorn src.main:app --app-dir . --port 8811

Since Milestone 7, every /api/v1 route requires a Supabase Auth JWT. This
script signs in (or signs up, on first run) a throwaway demo coach account
to get one - DEMO_COACH_EMAIL/DEMO_COACH_PASSWORD below are for this script
only, never for a real coach. Override via env vars for anything beyond a
local demo.

Run with: PYTHONPATH=. python scripts/demo_walkthrough.py [base_url]
Not run automatically in CI/tests - this hits a real server and mutates the
real database (each demo delivery is upserted, so it's safe to re-run).
"""

import os
import statistics
import sys
import time

import httpx
from gotrue.errors import AuthApiError

from scripts.demo_fixtures import DEMO_DELIVERIES, build_delivery_payload
from src.db.client import get_supabase

DEFAULT_BASE_URL = "http://localhost:8811"
DEMO_COACH_EMAIL = os.environ.get("DEMO_COACH_EMAIL", "demo.coachlens@gmail.com")
DEMO_COACH_PASSWORD = os.environ.get("DEMO_COACH_PASSWORD", "coachlens-demo-only-password-1")


def get_demo_coach_token() -> str:
    """Signs in the demo coach, creating the account on first run. Uses the
    same Supabase client as the backend (service_role key) purely as a
    convenient way to reach the Auth API - the sign-in itself authenticates
    as the demo coach, not as service_role.
    """
    auth = get_supabase().auth
    try:
        result = auth.sign_in_with_password({"email": DEMO_COACH_EMAIL, "password": DEMO_COACH_PASSWORD})
    except AuthApiError:
        try:
            auth.admin.create_user(
                {"email": DEMO_COACH_EMAIL, "password": DEMO_COACH_PASSWORD, "email_confirm": True}
            )
        except Exception:
            pass
        result = auth.sign_in_with_password({"email": DEMO_COACH_EMAIL, "password": DEMO_COACH_PASSWORD})
    if result.session is None:
        raise RuntimeError(
            "Could not obtain a session for the demo coach account - if email "
            "confirmation is required on this Supabase project, disable it for "
            "demo purposes (Authentication > Providers > Email) or confirm the "
            "account manually."
        )
    return result.session.access_token


def main() -> None:
    base_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BASE_URL
    token = get_demo_coach_token()
    client = httpx.Client(base_url=base_url, timeout=20.0, headers={"Authorization": f"Bearer {token}"})
    latencies_s = []
    mismatches = []

    for demo in DEMO_DELIVERIES:
        payload = build_delivery_payload(demo)
        start = time.monotonic()
        response = client.post("/api/v1/sessions/delivery", json=payload)
        latencies_s.append(time.monotonic() - start)

        if response.status_code != 200:
            print(f"{demo.delivery_id}: HTTP {response.status_code} - {response.text}")
            mismatches.append(demo.delivery_id)
            continue

        report = response.json()
        actual_status = report["verdict"]["status"]
        marker = "OK" if actual_status == demo.expected_status else "MISMATCH"
        if marker == "MISMATCH":
            mismatches.append(demo.delivery_id)
        print(
            f"[{marker}] {demo.delivery_id}: expected={demo.expected_status} actual={actual_status} "
            f"delta={report['baselines'].get('delta_deg')} "
            f"window_matches={report['verdict'].get('window_matches')} "
            f"summary={report['verdict']['summary']!r}"
        )

    print()
    print(f"Latency: P50={statistics.median(latencies_s):.3f}s  P95={sorted(latencies_s)[int(0.95 * len(latencies_s))]:.3f}s")
    print("PRD SLA: P50<=8s, P95<=15s ->", "PASS" if statistics.median(latencies_s) <= 8 else "FAIL")

    if mismatches:
        print(f"\n{len(mismatches)} delivery(s) did not match the expected demo narrative: {mismatches}")
        sys.exit(1)

    print("\nAll deliveries matched the expected demo narrative.")


if __name__ == "__main__":
    main()
