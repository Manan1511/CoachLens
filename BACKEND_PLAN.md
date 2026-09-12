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
- [ ] `athletes` (id, name, dob, guardian_consent flag — stub true for demo)
- [ ] `sessions` (id, athlete_id, date)
- [ ] `deliveries` (id, session_id, raw_keypoints jsonb, capture_metadata jsonb, created_at)
- [ ] `baselines` (athlete_id, metric, fixed_median, fixed_iqr, confirmed_at)
- [ ] `verdicts` (delivery_id, status, delta, window_matches, created_at)
- [ ] `coach_actions` (verdict_id, action, note, created_at)
- [ ] `drills` (id, title, prescription, contraindications, credential)
- [ ] Seed script: one athlete, confirmed fixed baseline, delivery history producing a 3-of-5 trigger, one occluded (low-confidence) delivery

## Milestone 3 — Measurement layer (pure functions, no ML)
- [ ] Pacing/thermal audit: reject if frame jitter > 8% → `ERR_THERMAL_THROTTLE`
- [ ] Quality firewall: `p_knee < 0.70` or `p_hip < 0.70` → `DATA_SUPPRESSED`
- [ ] Zero-phase 4th-order Butterworth filter (scipy `filtfilt`) on joint coordinates
- [ ] Multi-cue FFS detector (ankle height minima + horizontal decel + velocity zero-crossing fusion)
- [ ] Release-frame detector
- [ ] Unit tests with synthetic keypoint sequences (no real video needed)

## Milestone 4 — Interpretation layer (pure functions)
- [ ] Front Knee Extension angle calculation at FFS frame
- [ ] Forward Trunk Tilt calculation at release frame
- [ ] Dual-baseline delta: fixed reference (median ± IQR) — rolling 6-week median deferred (no data yet, see Dead End Registry)
- [ ] 3-of-5 rolling window classifier → `MECHANICAL_WATCH` / `TECHNICAL_CONCERN`
- [ ] Unit test every status transition explicitly

## Milestone 5 — Coaching layer / API routes
- [ ] `POST /api/v1/sessions/delivery` — ingest, run full pipeline, persist verdict
- [ ] `GET /api/v1/reports/{delivery_id}` — return coaching card
- [ ] `POST /api/v1/deliveries/{id}/action` — Approve / Dismiss / Nudge FFS (nudge re-runs pipeline from stored keypoints at new frame index)
- [ ] `POST /api/v1/athletes/{id}/baseline` — confirm fixed reference baseline
- [ ] Drill lookup + contraindication filter (static seeded drill table, no LLM)
- [ ] `GET /api/v1/athletes/{id}/history` — session/delivery history

## Milestone 6 — Demo readiness
- [ ] End-to-end run through seed data reproduces: `FORM_BENCHMARK` → isolated `MECHANICAL_WATCH` → `TECHNICAL_CONCERN` (3-of-5) → `DATA_SUPPRESSED` (occlusion)
- [ ] "Why was this flagged?" response payload includes trigger context (which prior deliveries matched)
- [ ] Latency sanity check against P50 ≤8s / P95 ≤15s (should be trivial with no ML/network in the loop)

## Deferred (post-hackathon, not blocking demo)
- [ ] Auth / real coach accounts (stub a coach id for now)
- [ ] Adolescent parental consent gate enforcement (schema field exists, not enforced)
- [ ] Rolling 6-week median (needs real longitudinal data)
- [ ] WhatsApp export integration (return card text/JSON only for now)
- [ ] Cloud-side pose extraction fallback

---

## Dead End Registry

Things tried and abandoned, written in plain language so we don't re-attempt them without a new reason.

*(empty so far — add an entry here whenever an approach is tried and dropped. Format: what was tried, why it didn't work, what we did instead.)*

---

## Notes on resolved spec conflicts

- **Status naming:** PRD markdown §6.2 code returns `UNCLASSIFIED_DEVIATION` for the isolated-deviation case; the PDF's diagrams and UI mockups use `MECHANICAL_WATCH` for the same case. We're using `MECHANICAL_WATCH` everywhere in code — it's the one that appears in the actual demo script and UI card mockups.
- **Where pose extraction runs:** doc header says "Cloud FastAPI Batch Worker," but PRD §7.1's ingestion payload already carries `raw_keypoints`, and the PDF's Layer 1 says "MediaPipe Edge Extraction." We're going with on-device extraction — backend receives keypoints only, never video.
- **Folder structure vs. README:** README's `services/` lists `measurement-engine/`, `interpretation-engine/`, `coaching-api/`, `drill-library/` as if they were four separate deployables. Per the modular-monolith decision, all of that lives inside one deployable at `services/coaching-api/`, with `measurement/`, `interpretation/`, `coaching/` as internal Python packages (no network hops between them). `drill-library` is just a seeded table for now, not a service.
