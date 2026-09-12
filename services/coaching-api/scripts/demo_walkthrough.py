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

Run with: PYTHONPATH=. python scripts/demo_walkthrough.py [base_url]
Not run automatically in CI/tests - this hits a real server and mutates the
real database (each demo delivery is upserted, so it's safe to re-run).
"""

import statistics
import sys
import time

import httpx

from scripts.demo_fixtures import DEMO_DELIVERIES, build_delivery_payload

DEFAULT_BASE_URL = "http://localhost:8811"


def main() -> None:
    base_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BASE_URL
    client = httpx.Client(base_url=base_url, timeout=20.0)
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
