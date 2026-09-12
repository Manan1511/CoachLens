# CoachLens (Kinetix Video Coach)

AI-assisted quantitative 2D biomechanical review assistant for fast bowling stride analysis (grassroots cricket). See [`Kinetix_PRD.md`](Kinetix_PRD.md) and [`Kinetix_PRD_System_Specification.pdf`](Kinetix_PRD_System_Specification.pdf) for the full product/technical spec — this README covers repo layout and team workflow.

> Kinetix is a **quantitative coaching tool**, not a medical/injury diagnostic system. Keep that boundary in mind when naming code, fields, and UI copy (see PRD §1).

## Architecture at a glance

The system is a decoupled tri-layer pipeline (PRD §4):

1. **Measurement Engine** — pose extraction, quality firewall, filtering, event (FFS) detection.
2. **Interpretation Engine** — deterministic baseline triangulation, 3-of-5 rolling window flagging.
3. **Coaching Engine** — human-in-the-loop review, drill retrieval, audit logging, export.

Each layer should map to its own service/package so ML (Layer 1) stays isolated from deterministic business logic (Layers 2–3), per the "Deterministic Business Logic" invariant.

## Proposed folder structure

```
coachlens/
├── apps/
│   ├── mobile/                # Capture app (Android/iOS) — stencil overlay, recording, upload
│   └── coach-dashboard/       # Web app for coach review, approve/dismiss, drill assignment
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
├── Kinetix_PRD.md
├── Kinetix_PRD_System_Specification.pdf
└── README.md
```

Adjust the exact tree once implementation starts, but keep the **Layer 1 / Layer 2 / Layer 3 separation** and the **shared `contracts` package** — both are load-bearing for the architecture described in the PRD.

## Collaboration conventions

### Branching & PRs
- `main` is always deployable. Work happens on short-lived branches: `feat/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`.
- Open a PR early (draft is fine) so the tri-layer boundary is reviewable — flag any change that leaks ML/probabilistic logic into Layers 2–3, since deterministic auditability is a hard system invariant.
- Use the PR template to note: which layer(s) changed, whether JSON contracts (`packages/contracts`) changed, and whether SLA/validation numbers (PRD §9) are affected.

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
- Keep `Kinetix_PRD.md` as the single source of truth for product behavior; if implementation diverges from the PRD, update the PRD in the same PR rather than letting docs drift.
