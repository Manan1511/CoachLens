# CoachLens — Backend Implementation Plan

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked/skipped (explain in Dead End Registry if abandoned)

**Scope:** backend only. Frontend/mobile is a separate workstream. Pose extraction happens **on-device** (phone runs MediaPipe and POSTs `raw_keypoints`); the backend never touches raw video and never runs ML inference. Everything below is deterministic Python + Postgres (Supabase).

**Priority:** hackathon demo path first (seed data, one end-to-end flow: benchmark → 3-of-5 drift trigger → occlusion suppression), then fill in the rest if time allows.

**Architecture:** modular monolith — one FastAPI app, three internal packages (`measurement/`, `interpretation/`, `coaching/`) as pure functions with no I/O. Persistence only happens in route handlers.

**Canonical status enum** (resolves PRD conflict — see Dead End Registry): `DATA_SUPPRESSED`, `FORM_BENCHMARK`, `MECHANICAL_WATCH`, `TECHNICAL_CONCERN`.

---

## Milestone 0 — Project scaffold
- [x] FastAPI app skeleton (`services/coaching-api/src/main.py`, `measurement/`, `interpretation/`, `coaching/`, `db/`)
- [x] Supabase project created (`coachlens`, region `ap-south-1`, org "Ironically an engineer"); URL + publishable key in `.env.example`, service_role key left blank for local secrets
- [x] `requirements.txt` + `requirements-dev.txt` (fastapi, uvicorn, scipy, numpy, supabase, pydantic-settings, pytest)
- [x] Basic health-check endpoint (`GET /health`) — verified via pytest and a live uvicorn boot (200 OK on `/health` and `/docs`)

## Milestone 1 — Contracts
- [x] Pydantic models for delivery ingestion payload (`src/schemas/delivery.py`, PRD §7.1) — added optional `shoulder` landmark (needed for trunk-tilt, PRD's example payload omits it)
- [x] Pydantic models for coaching card report (`src/schemas/report.py`, PRD §7.2)
- [x] Canonical status enum (`src/schemas/status.py`: `DeliveryStatus`, `WindowPattern`) — single source of truth, resolves the `MECHANICAL_WATCH` vs `UNCLASSIFIED_DEVIATION` conflict
- [x] Contract tests validating both schemas against the PRD's exact example JSON (`tests/test_schemas.py`) — 4/4 passing
- [x] Stub routes (`POST /api/v1/sessions/delivery`, `GET /api/v1/reports/{delivery_id}`) wired into `main.py` so the OpenAPI spec reflects real shapes (bodies raise `NotImplementedError` until Milestone 5)
- [x] OpenAPI spec auto-export script (`scripts/export_openapi.py` → `docs/openapi.json`) — share this file with the frontend team, regenerate whenever schemas/routes change

## Milestone 2 — Database schema (Supabase/Postgres)
- [x] `athletes` (id, name, dob, guardian_consent flag — stub true for demo)
- [x] `sessions` (id, athlete_id, session_date)
- [x] `deliveries` (id, session_id, raw_keypoints jsonb, capture_metadata jsonb, created_at)
- [x] `baselines` (athlete_id, metric, fixed_median_deg, fixed_iqr_deg, confirmed_at) — composite PK (athlete_id, metric)
- [x] `verdicts` (delivery_id, status, window_pattern, window_matches, delta_deg, drill_id, created_at) — `status`/`window_pattern` are Postgres enums matching `src/schemas/status.py` exactly
- [x] `coach_actions` (verdict_id, action, note, nudge_frame_delta, created_at)
- [x] `drills` (id, title, prescription, contraindications text[], credential)
- [x] RLS enabled on all 7 tables with no policies (default-deny) — backend uses `service_role` exclusively, which bypasses RLS; the anon/publishable key gets zero access. Caught via `get_advisors` security check (ERROR-level `rls_disabled_in_public` before the fix).
- [x] Fixed a related bug in `src/db/client.py`: it silently fell back to the publishable key if `service_role` was unset. Under default-deny RLS that would fail silently (empty results) instead of loudly — changed to raise `RuntimeError` at call time. Covered by `tests/test_db_client.py`.
- [x] Migrations version-controlled at `services/coaching-api/supabase/migrations/` (pulled down from the live project via `list_migrations`, not just left in Supabase's dashboard)
- [x] Seed script (`scripts/seed.py`): one athlete, confirmed fixed baseline, 5-delivery history designed to trigger `FORM_BENCHMARK` → `MECHANICAL_WATCH` → `TECHNICAL_CONCERN` (3-of-5) → `DATA_SUPPRESSED`. **Not yet run locally** — needs `SUPABASE_SERVICE_ROLE_KEY` in `.env`, which only the project owner can retrieve from the Supabase dashboard (Project Settings > API). Schema itself was verified end-to-end via direct SQL (enums, jsonb, FKs, cascade deletes all confirmed working).

## Milestone 3 — Measurement layer (pure functions, no ML)
- [x] Pacing/thermal audit (`src/measurement/audit.py`): recomputes jitter from raw `t_ms` deltas rather than trusting the client-reported `capture_metadata.pacing_jitter_pct` — an audit that just trusts the self-reported number defeats its own purpose. Raises `ThermalThrottleError` (`ERR_THERMAL_THROTTLE`) above 8%.
- [x] Quality firewall (`src/measurement/quality.py`): `passes_quality_firewall` (knee+hip, for knee-angle metric) and `passes_trunk_tilt_quality_firewall` (hip+shoulder, for trunk-tilt metric) — two gates because the two metrics depend on different landmarks.
- [x] Zero-phase 4th-order Butterworth filter (`src/measurement/filtering.py`, scipy `filtfilt`, 6 Hz cutoff — documented placeholder pending Stage 1 calibration). Confidence values pass through unfiltered.
- [x] Multi-cue FFS detector (`src/measurement/events.py::detect_ffs_frame`) — fuses ankle-velocity, ankle-height, and horizontal-deceleration cues with equal weights (PRD §6.1 doesn't specify weights). Returns the actual frame *number*, not list index.
- [x] Release-frame detector (`detect_release_frame`) — see contract change below; needed a wrist landmark that didn't exist in the schema.
- [x] Unit tests with synthetic keypoint sequences (`tests/test_measurement.py`, 11 tests) — including a mutation check (temporarily broke `detect_ffs_frame` to confirm the test actually fails on a wrong implementation, not just tautologically passes)

## Milestone 4 — Interpretation layer (pure functions)
- [x] Front Knee Extension angle calculation (`src/interpretation/angles.py::front_knee_angle_deg`) — verified against known geometry (straight leg = 180°, right-angle bend = 90°), not just plausible-looking numbers
- [x] Forward Trunk Tilt calculation (`forward_trunk_tilt_deg`) — verified upright = 0°, 45° lean = 45°
- [x] Dual-baseline delta (`src/interpretation/baseline.py::evaluate_delivery_deviation`) — fixed reference (median ± IQR) only; rolling 6-week median still deferred, no data exists yet
- [x] 3-of-5 rolling window classifier → `FORM_BENCHMARK` / `MECHANICAL_WATCH` / `TECHNICAL_CONCERN`, ported from PRD §6.2's reference pseudocode with the canonical status names
- [x] Unit tests for every status transition (`tests/test_interpretation.py`, 25 total incl. measurement) — including one against the PRD §7.2 example's exact numbers, and one that caught a wrong assumption in my own test (current delivery always matches itself in the rolling window, so the floor is 1 match not 0 — fixed the test, not the implementation, since the implementation was right)

## Interim: demo pipeline wiring (superseded by Milestone 5)
- [x] Ahead of this milestone, `pipeline.py` briefly used an in-memory `DEMO_BASELINES`/`DEMO_ROLLING_HISTORY` store so the API could be demoed via Swagger before real persistence existed. That in-memory version is **gone** — replaced entirely by the Supabase-backed version below. Kept this line for history; nothing here still applies to the current code.
- [x] Swagger UI switched to a dark theme (`/docs` now serves `swagger-ui.css` + an appended `theme-dark.css` overlay, since the theme CSS alone breaks layout without the base stylesheet) — this part is still current.

## Milestone 5 — Coaching layer / API routes
- [x] `POST /api/v1/sessions/delivery` — ingest, run full pipeline, persist verdict (`src/coaching/pipeline.py::evaluate_delivery`, real Supabase reads/writes via `src/coaching/repository.py`)
- [x] `GET /api/v1/reports/{delivery_id}` — reconstructs the coaching card purely from persisted rows (`repository.get_report`), not by recomputing from raw keypoints
- [x] `POST /api/v1/deliveries/{id}/nudge-ffs` — re-runs the pipeline from stored keypoints at `auto_detected_frame + frame_delta` (split out from the combined Approve/Dismiss/Nudge action in the original plan bullet, since nudge re-evaluates while the other two just record a decision)
- [x] `POST /api/v1/deliveries/{id}/action` — Approve / Dismiss, recorded against the delivery's latest verdict as an audit-trail append
- [x] `POST /api/v1/athletes/{id}/baseline` — confirm fixed reference baseline (median + IQR)
- [x] Drill lookup (`repository.get_drill`) — one seeded drill assigned on `TECHNICAL_CONCERN`; contraindication *filtering* against athlete medical data is not modeled (no athlete medical data exists in the schema) — contraindications are returned as informational text only, per PRD §7.2's example
- [x] `GET /api/v1/athletes/{id}/history` — sessions → deliveries → verdicts, nested via PostgREST embedding
- [x] Schema changes discovered while building this milestone: `verdicts` needed `metric`, `event_frame`, `observed_value_deg`, `confidence` columns — none existed after Milestone 2, because nothing before this milestone needed to *reconstruct* a report from stored data alone. All three migrations applied and pulled into `supabase/migrations/`.
- [x] Avoided PostgREST's filter-on-embedded-resource syntax (e.g. `deliveries.sessions.athlete_id`) in `get_rolling_history_deltas` — it's real syntax, but with RLS default-deny there's no way to verify it against the live API without the service_role key, so used three plain queries (sessions → deliveries → verdicts) instead, each using only basic, well-established operations
- [x] 51 tests total (up from 25) — repository tests mock `get_supabase()`'s fluent chain with `unittest.mock.MagicMock`; pipeline tests monkeypatch the `repository` module boundary directly; route tests monkeypatch pipeline/repository as bound into each route module's namespace. Ran a mutation check on the rolling-history reversal logic (real bug caught, then reverted after confirming the test failed correctly).
- [x] Verified the 3 new `verdicts` columns end-to-end with a real insert against the live schema via direct SQL (not just "migration applied successfully")

## Milestone 6 — Demo readiness
- [x] **Found and fixed a real bug**: `scripts/seed.py` (written in Milestone 2) wrote single-frame deliveries directly into the `deliveries` table. `detect_ffs_frame` requires ≥3 frames — running these through the real pipeline would have crashed with `ValueError`, and writing straight to the table bypassed the pipeline entirely anyway (no verdict would ever be created). Neither issue was caught until actually trying to build this milestone's end-to-end check.
- [x] `scripts/demo_fixtures.py` — single source of truth for the demo scenario (used by both the automated test and the live walkthrough script, so they can't silently diverge). Ankle geometry constructed so `front_knee_angle_deg` returns an exact chosen value by construction, not by trial and error.
- [x] `scripts/seed.py` rewritten to seed only reference data (athlete/session/baseline/drill) — deliveries are created by actually running them through the pipeline, not written directly
- [x] `scripts/demo_walkthrough.py` — the real hackathon demo script: POSTs the 5 demo deliveries to a running server over HTTP, prints per-delivery status vs. expected, and reports P50/P95 latency against the PRD §9 SLA. **Not run in this session** (needs `SUPABASE_SERVICE_ROLE_KEY`, which only the project owner can retrieve) — run it yourself once the key is set and the server is up.
- [x] End-to-end status sequence verified two ways: (1) `tests/test_demo_scenario.py` runs the 5 deliveries through `pipeline.evaluate_delivery` directly against a hand-built in-memory `FakeRepository` that accumulates rolling history exactly like the real DB would across sequential calls; (2) the same scenario through the actual HTTP routes via `TestClient`. Both confirm: `FORM_BENCHMARK` → `MECHANICAL_WATCH` (isolated) → `MECHANICAL_WATCH` (building) → `TECHNICAL_CONCERN` (3-of-5) → `DATA_SUPPRESSED`. Ran a mutation check (flipped an expected status, confirmed the test failed, reverted) to make sure this wasn't a vacuous pass.
- [x] "Why was this flagged?" trigger context — **this wasn't actually implemented before this milestone**; `Verdict` only had an aggregate `window_matches` count, not which prior deltas contributed (the PRD's UI mockup shows specific ball numbers/values). Added `DeviationResult.trigger_deltas` (`baseline.py`), a new `trigger_deltas` jsonb column on `verdicts`, and `Verdict.trigger_context_deltas` in the API response. Verified: for the `TECHNICAL_CONCERN` delivery, `trigger_context_deltas` has exactly `window_matches` entries; for `FORM_BENCHMARK`/`DATA_SUPPRESSED` it's `None` (no window was evaluated). Also verified the new column with a real insert against the live schema.
- [x] Latency: measured the compute-only path (audit → filter → FFS-detect → angle → interpretation) at <1s per delivery in-process — this is the dominant cost since there's no ML inference or video upload in this backend. Real end-to-end timing (including Supabase round-trips) can only be measured with real credentials; `demo_walkthrough.py` does that measurement when run against a live server.

## Post-Milestone-6 code review
Ran a full correctness/best-practices review of `services/coaching-api`. Found and fixed 2 real bugs, both stemming from the same root cause: `verdicts` rows are append-only per delivery (a Nudge FFS re-evaluation `.insert()`s a new row rather than replacing the old one), but nothing downstream accounted for that.
- [x] **`get_rolling_history_deltas` window could silently shrink or double-count** (`repository.py`) — `.limit(4)` was applied to raw verdict rows before excluding `DATA_SUPPRESSED` rows or deduping by `delivery_id`. A suppressed delivery could eat a window slot before being dropped (shrinking the effective window below 4 right when PRD-expected occlusion happens), and a nudged delivery's two verdict rows both counted (double-counting one physical delivery). Fixed by deduping-by-delivery-keeping-latest and filtering out suppressed rows in Python *before* truncating to `limit`, not after. Two regression tests added; both verified to fail against the old implementation before the fix and pass after.
- [x] **Nudge FFS wasn't cumulative** (`pipeline.py::nudge_and_reevaluate`) — it fetched the delivery's latest verdict only to null-check it, then discarded it and always recomputed the base frame via a fresh `detect_ffs_frame` call. Two `+1` nudges in a row both landed on `auto_frame + 1` instead of moving two frames total. Fixed to read the current frame from the latest verdict's stored `event_frame` and nudge from there. Regression test added (two sequential nudges), verified to fail against the old implementation before the fix.
- [x] **Orphaned delivery row on missing baseline** (`pipeline.py`) — `evaluate_delivery` persisted the delivery row before the baseline-existence check could raise `UnknownBaselineError`, leaving an orphan delivery with zero verdicts and a confusing 404 on a later GET. Fixed by splitting the pipeline into `_score` (pure decision logic — reads baseline/history, may raise, never writes) and `_persist_and_build_report` (writes only once `_score` has already succeeded). `evaluate_delivery` now calls `_score` before `repository.save_delivery`, so nothing is persisted if the baseline is missing. (Verdicts still can't be written before their delivery — `verdicts.delivery_id` has a hard FK to `deliveries` — so the delivery write still has to happen first among the writes; the fix is ensuring no writes happen until we know they'll succeed.) Regression test added, verified to fail against the old order before the fix.
- [x] **Silent unfiltered fallback** (`pipeline.py`) — `_filtered_or_raw` now returns `(frames, was_filtered: bool)` instead of just `frames`; the flag flows into a new `Kinematics.filtered` field (and a matching `verdicts.filtered` DB column) so a coach or downstream consumer can tell a noisier, unfiltered measurement apart from a clean one instead of both looking identical. Verified true/false in both the fresh-compute path and a real DB round-trip.
- [x] **Unbounded rolling-history scan** (`repository.py`) — `get_rolling_history_deltas` now caps the initial sessions lookup at `RECENT_SESSIONS_SCAN_LIMIT` (20) instead of scanning an athlete's entire multi-season history on every ingest. Documented as a pragmatic bound, not a perfect fix — an athlete with fewer than 4 valid deliveries across their most recent 20 sessions would see a shorter window than intended; a schema change adding `athlete_id` directly to `deliveries`/`verdicts` would remove the need for this bound entirely but is a bigger change than fixing the immediate cost.

## Milestone 7 — Auth, consent gate, cloud pose extraction
Picked up from the Deferred list below, at the user's direction. Scope: (1) auth/real coach accounts, (2) adolescent consent gate enforcement, (3) cloud-side pose extraction fallback.
- [x] Auth: `src/coaching/auth.py::require_coach` verifies coach identity via Supabase Auth (`auth.get_user(jwt)` — a network call to the Auth service on every request, not local JWT-secret decoding, so a revoked token is rejected immediately rather than staying valid until expiry). Coaches sign in client-side against the Supabase Auth SDK; the backend never sees or handles a password.
- [x] `coach_actions.coach_id` and `baselines.confirmed_by` columns added (both `uuid references auth.users(id)`) — coach approve/dismiss actions and baseline confirmations are now attributed to the authenticated coach, not anonymous.
- [x] All `/api/v1/*` routes protected behind `require_coach` (router-level `dependencies=[Depends(require_coach)]` on `deliveries.py`; per-endpoint `Depends` on `actions.py`/`athletes.py` where the coach identity is also needed for attribution). Verified with a real enforcement test that clears the auth override and confirms every route 401s without a token, plus `/health` staying open.
- [x] Consent gate (`pipeline._check_consent`, PRD §10): blocks `evaluate_delivery`/`nudge_and_reevaluate` for an athlete under 18 without `guardian_consent = true`, called before any writes (same "score before persist" principle as the baseline check). **Honest limitation, not silently perfect**: if an athlete has no `dob` on file, minor status can't be determined and the gate does not block — documented in the function's own docstring rather than asserted as complete. Mutation-tested (temporarily disabled the check, confirmed the test caught it).
- [x] `scripts/demo_walkthrough.py` updated to sign in (or sign up, first run) a throwaway demo coach via Supabase Auth and attach the resulting JWT — it would otherwise 401 against the now-protected routes.
- [ ] **Cloud pose extraction fallback: not started — design proposal needed first.** This item directly contradicts the Milestone 0 architecture decision ("pose extraction happens on-device... the backend never touches raw video and never runs ML inference") — it's not an incremental addition, it's a second ingestion path with a different trust/privacy/infrastructure model (video upload, ephemeral storage + deletion, GPU/CPU inference serving). Flagged to the user rather than silently built.

## Deferred (post-hackathon, not blocking demo)
- [ ] Rolling 6-week median (needs real longitudinal data)
- [ ] WhatsApp export integration (return card text/JSON only for now)

---

## Dead End Registry

Things tried and abandoned, written in plain language so we don't re-attempt them without a new reason.

*(empty so far — add an entry here whenever an approach is tried and dropped. Format: what was tried, why it didn't work, what we did instead.)*

---

## Notes on resolved spec conflicts

- **Status naming:** PRD markdown §6.2 code returns `UNCLASSIFIED_DEVIATION` for the isolated-deviation case; the PDF's diagrams and UI mockups use `MECHANICAL_WATCH` for the same case. We're using `MECHANICAL_WATCH` everywhere in code — it's the one that appears in the actual demo script and UI card mockups.
- **Where pose extraction runs:** doc header says "Cloud FastAPI Batch Worker," but PRD §7.1's ingestion payload already carries `raw_keypoints`, and the PDF's Layer 1 says "MediaPipe Edge Extraction." We're going with on-device extraction — backend receives keypoints only, never video.
- **Contract change during Milestone 3:** the PRD's §5 release event ("arm extended overhead") needs a wrist landmark to detect, but §7.1's example payload has no wrist field — only knee/hip/ankle(+shoulder, itself already an addition). Added an optional `wrist: Landmark | None` to `KeypointFrame` (`src/schemas/delivery.py`). This means the phone/frontend needs to send one more landmark; flagged to the user and confirmed before implementing rather than faking a proxy heuristic.
- **FFS/pacing-audit weighting placeholders:** PRD §6.1's fused score has weights `w1/w2/w3` with no numeric values given (text elsewhere says "pending Stage 1 calibration"). Implemented as equal weights, explicitly documented in `events.py` as a placeholder — not a derived or tuned value. Revisit once real validation data exists (Milestone 9-equivalent in the original checklist).
- **Folder structure vs. README:** README's `services/` lists `measurement-engine/`, `interpretation-engine/`, `coaching-api/`, `drill-library/` as if they were four separate deployables. Per the modular-monolith decision, all of that lives inside one deployable at `services/coaching-api/`, with `measurement/`, `interpretation/`, `coaching/` as internal Python packages (no network hops between them). `drill-library` is just a seeded table for now, not a service.
