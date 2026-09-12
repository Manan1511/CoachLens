# CoachLens

AI-assisted quantitative 2D biomechanical review assistant for fast bowling stride analysis (grassroots cricket). See [`CoachLens_PRD.md`](CoachLens_PRD.md) and [`CoachLens_PRD_System_Specification.pdf`](CoachLens_PRD_System_Specification.pdf) for the full product/technical spec — this README covers repo layout and team workflow.

> CoachLens is a **quantitative coaching tool**, not a medical/injury diagnostic system. Keep that boundary in mind when naming code, fields, and UI copy (see PRD §1).

## Live Deployment (Backend API)

The backend is deployed, fully persistent (Supabase Postgres), and live on Render:
- **Base API URL:** `https://coachlens-xvh3.onrender.com`
- **Interactive Swagger Docs:** [https://coachlens-xvh3.onrender.com/docs](https://coachlens-xvh3.onrender.com/docs)
- **Health Check:** [https://coachlens-xvh3.onrender.com/health](https://coachlens-xvh3.onrender.com/health) (`{"status": "ok"}`)
- **OpenAPI Schema:** [https://coachlens-xvh3.onrender.com/openapi.json](https://coachlens-xvh3.onrender.com/openapi.json)

### Core Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/sessions/delivery` | Ingest keypoints, run Butterworth filter, detect FFS/release, persist & score |
| `GET` | `/api/v1/reports/{delivery_id}` | Reconstruct coaching card report from stored verdict kinematics |
| `GET` | `/api/v1/reports/{delivery_id}/export/whatsapp` | Export WhatsApp-ready formatted coaching text card (PRD §10.3) |
| `POST` | `/api/v1/deliveries/{delivery_id}/nudge-ffs?frame_delta=1` | Coach manual adjustment of FFS plant frame (+/-1 frame) |
| `POST` | `/api/v1/deliveries/{delivery_id}/action` | Coach approval/dismissal audit trail with coach attribution |
| `GET` | `/api/v1/athletes` | List athletes for roster & session-pool selection |
| `POST` | `/api/v1/athletes` | Register a new athlete (name, bowling arm, guardian consent) |
| `POST` | `/api/v1/athletes/{athlete_id}/sessions` | Idempotent start/resume of today's session for an athlete |
| `POST` | `/api/v1/athletes/{athlete_id}/baseline` | Confirm fixed reference baseline (median ± IQR) |
| `GET` | `/api/v1/athletes/{athlete_id}/history` | Nested athlete history (`sessions` → `deliveries` → `verdicts`) |
| `GET` | `/health` | Unauthenticated container liveness probe |

---

## Interactive Testing & Verification

All backend code lives in `services/coaching-api/`.

### Setup & Dependencies
```bash
cd services/coaching-api
# Install API & interactive dev tracking dependencies (includes OpenCV and MediaPipe 0.10.14)
pip install -r requirements-dev.txt
```

### 1. Live Webcam MediaPipe Tracker
Test real-time bowler tracking with your camera:
```powershell
cd services/coaching-api
# PowerShell:
$env:PYTHONPATH="."
.venv\Scripts\python scripts/live_webcam_tracker.py

# Bash / macOS / Linux:
PYTHONPATH=. .venv/bin/python scripts/live_webcam_tracker.py
```
* **Controls:** Press `[SPACE]` to record a delivery stride and evaluate against the live API; press `[q]` to quit.
* **HUD:** Displays live skeleton overlay, knee angle, trunk tilt, quality firewall status, and returned coach verdicts.

### 2. Automated 5-Delivery Demo Walkthrough
Executes the validated hackathon narrative (`FORM_BENCHMARK` → `MECHANICAL_WATCH` → `MECHANICAL_WATCH` → `TECHNICAL_CONCERN` → `DATA_SUPPRESSED`) and measures P50/P95 latency against the PRD §9 SLA:
```bash
cd services/coaching-api
# Run against live Render deployment:
PYTHONPATH=. .venv/Scripts/python scripts/demo_walkthrough.py https://coachlens-xvh3.onrender.com

# Or against local uvicorn:
PYTHONPATH=. .venv/Scripts/python scripts/demo_walkthrough.py
```

### 3. Run Test Suite
```bash
cd services/coaching-api
.venv/Scripts/python -m pytest
```
*84 unit, contract, and integration tests passing.*

---

## Architecture & System Design

The system is a decoupled tri-layer pipeline (PRD §4):

1. **Measurement Engine** — pose extraction, quality firewall, filtering, event (FFS) detection.
2. **Interpretation Engine** — deterministic baseline triangulation, 3-of-5 rolling window flagging.
3. **Coaching Engine** — human-in-the-loop review, drill retrieval, audit logging, export.

Each layer should map to its own service/package so ML (Layer 1) stays isolated from deterministic business logic (Layers 2–3), per the "Deterministic Business Logic" invariant.

## Proposed folder structure

```
coachlens/
├── apps/
│   └── web/                   # React/TS/Tailwind app: marketing site (/) + coach
│                               # dashboard (/app/*) in one routed build — see
│                               # DESIGN.md and apps/web/src/routes/dashboard/
│
├── services/
│   ├── measurement-engine/    # Layer 1: pose extraction, quality firewall, filtering, FFS detection
│   │   ├── src/
│   │   ├── models/            # RTMDet/RTMPose/MediaPipe weights & wrappers (not raw video)
│   │   └── tests/
│   ├── interpretation-engine/ # Layer 2: baseline triangulation, rolling window, angle calculators
│   │   ├── src/
│   │   └── tests/
│   ├── coaching-api/          # Layer 3: FastAPI service — sessions, deliveries, reports, drills
│   │   ├── src/
│   │   │   ├── routes/        # /api/v1/sessions, /api/v1/reports, ...
│   │   │   ├── schemas/       # JSON contract models (delivery ingestion, coaching card)
│   │   │   └── state_machine/ # DATA_SUPPRESSED / UNCLASSIFIED / TECHNICAL_CONCERN flow
│   │   └── tests/
│   └── drill-library/         # Credentialed S&C drill schemas (UKCC/BCCI), versioned content
│
├── packages/                  # Shared libraries used across services/apps
│   ├── contracts/             # Shared JSON schema / OpenAPI / type definitions (source of truth)
│   └── biomech-math/          # Shared angle/vector math used by measurement + interpretation
│
├── infra/
│   ├── docker/                # Dockerfiles per service
│   ├── k8s/ or terraform/     # Deployment manifests (pick one, keep consistent)
│   └── ci/                    # CI pipeline definitions (if not using root .github/workflows)
│
├── data/
│   ├── baselines/             # Fixed reference baseline datasets (numerical arrays only — no video)
│   └── validation/            # Held-out bowler validation sets for MAE/SLA testing (PRD §9)
│
├── docs/
│   ├── adr/                   # Architecture Decision Records
│   ├── runbooks/              # On-call / operational runbooks
│   └── api/                   # Generated API docs
│
├── .github/
│   ├── workflows/             # CI: lint, test, build per service
│   └── PULL_REQUEST_TEMPLATE.md
│
├── CoachLens_PRD.md
├── CoachLens_PRD_System_Specification.pdf
└── README.md
```

Adjust the exact tree once implementation starts, but keep the **Layer 1 / Layer 2 / Layer 3 separation** and the **shared `contracts` package** — both are load-bearing for the architecture described in the PRD.

## Collaboration conventions

### Branching & PRs
- Backend team works directly on `dev` — commit straight to `dev`, no feature branches or PRs for backend-only changes. Frontend and backend are separate workstreams/repos-in-practice, so there's no cross-review gate blocking either side.
- `dev` gets merged/promoted to `main` for releases (define this cutover process once a release cadence is needed).
- Still keep commits scoped and don't push broken/untested code to `dev` — it's the shared integration branch, not a personal scratch branch.
- If a change is risky (schema-breaking, infra migration), give the team a heads-up before committing rather than after.

### Contracts-first workflow
- Any change to the delivery ingestion payload or coaching card schema (PRD §7) starts in `packages/contracts`, not in an individual service. Bump a version and update all consumers in the same PR, or split into "add new field" → "migrate consumers" → "remove old field" PRs for non-trivial changes.

### Commit messages
- Conventional-commit style is recommended: `feat(measurement): add multi-cue FFS detector`, `fix(coaching-api): correct 3-of-5 window edge case`.

### Testing expectations
- **Measurement Engine:** unit tests on filtering/event-detection math; accuracy tests against the held-out validation set (Knee Angle MAE ≤ 4.0°, Trunk Tilt MAE ≤ 3.5°, per PRD §9).
- **Interpretation Engine:** deterministic logic — every status transition (`FORM_BENCHMARK`, `UNCLASSIFIED_DEVIATION`, `TECHNICAL_CONCERN`, `DATA_SUPPRESSED`) needs a unit test, since this logic must stay auditable.
- **Coaching API:** contract tests against `packages/contracts` schemas; state-machine tests for the human-in-the-loop flow (PRD §8).
- CI should block merges on failing tests for the layer(s) touched.

### Code ownership
- Add a `CODEOWNERS` file mapping each `services/*` and `apps/*` directory to the engineer(s)/team responsible, so PRs auto-route for review — especially important given the ML/deterministic-logic boundary.

### Data & privacy handling
- Never commit raw video, real athlete PII, or fixture files containing them. Only numerical arrays (`[x, y, confidence, t]`) belong in `data/` or test fixtures, per the Ephemeral Video Pipeline invariant (PRD §10).
- Treat `data/baselines/` and `data/validation/` as append-only, reviewed datasets — changes here affect every downstream SLA metric.

### Documentation
- Record any architecture-affecting decision (e.g., swapping RTMPose for MediaPipe, changing the baseline triangulation formula) as an ADR in `docs/adr/`.
- Keep `CoachLens_PRD.md` as the single source of truth for product behavior; if implementation diverges from the PRD, update the PRD in the same PR rather than letting docs drift.
