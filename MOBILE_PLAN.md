# CoachLens — Mobile Capture App: Implementation Plan

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked/skipped (explain in Dead End Registry if abandoned)

## Why this app exists

The PRD's capture-quality targets (shutter speed ≤1/1000s, 60/120fps, on-device pose extraction so raw video never leaves the phone) cannot be met by a browser: web APIs expose no manual shutter/exposure control on any platform, and iOS Safari in particular exposes none of the advanced `MediaTrackConstraints` at all. A native app is the only way to hit these targets and to keep the "video never leaves the device" privacy invariant (PRD §10) — only numerical keypoints are ever sent to the backend.

**This reverses `FRONTEND_PLAN.md`'s "web app, not a mobile app" framing**, which lists mobile-app framing as an abandoned dead end and has already shipped marketing copy ("nothing to install") against that decision. The frontend workstream owner needs to reconcile that copy/positioning with this decision — not done as part of this plan, flagged here so it isn't missed.

## Scope boundary

- This app **only** captures deliveries: guided setup (distance/tripod/roll), records, runs on-device pose extraction (MediaPipe), and posts `raw_keypoints` + `capture_metadata` to the existing `POST /api/v1/sessions/delivery` contract. It does not replace the coach dashboard (web, separate workstream) — no history views, no drill assignment, no auth-heavy screens beyond whatever's needed to attribute a delivery to a coach/session.
- Backend contract does not change. The app is a new consumer of the same API `services/coaching-api` already exposes.

## Stack

- **Expo (managed workflow, custom dev client)** — chosen over bare React Native CLI because this machine has no Android Studio/SDK/JDK17 installed. `eas build` compiles the APK in the cloud; only `adb`/platform-tools + a physical Android device are needed locally to install and test.
- **Android only, first** — this dev machine can't build iOS regardless of framework (needs a Mac/Xcode). iOS is deferred, not abandoned.
- **react-native-vision-camera** (frame processors) for capture + real-time on-device pose extraction, MediaPipe Tasks (Pose Landmarker) as the actual model — this needs a native module and therefore a **dev client** build, not plain Expo Go.

## Milestone 0 — Scaffold
- [~] `apps/mobile/` Expo TypeScript project
- [ ] `expo-dev-client` installed, EAS project configured (`eas.json`, `app.json` with a dev-client build profile)
- [ ] First EAS Android build succeeds and installs on a physical device via `adb install`
- [ ] `.gitignore` covers Expo/RN build artifacts (`.expo/`, `android/`, `ios/` if prebuilt, `*.apk`)

## Milestone 1 — Camera + guided setup
- [ ] Camera permission flow
- [ ] Alignment/stencil overlay matching PRD capture constraints (2.8–3.2m distance, 1.1m tripod height, roll/pitch <3°)
- [ ] Request best-effort `fps`/resolution via vision-camera's format selection; surface actually-granted values (not just requested) in the UI
- [ ] **Current-bowler selector + quick-switch control.** Real nets workflow: one coach, one phone, several different bowlers taking turns. The app must always have an explicit "who's bowling right now" selection — never infer it from whatever was last recorded — and switching bowlers must be fast enough to not slow down a live nets session (a persistent header control, not a buried settings screen). On each switch, call `POST /api/v1/athletes/{athlete_id}/sessions` to get-or-create that bowler's session for today, and use the returned `session_id` for every delivery until the next switch. See `BACKEND_PLAN.md` Milestone 8 for the backend fix this depends on (athlete identity is now resolved server-side from `session_id`, not sent by the client) and why it mattered: a stale session_id after a quick switch used to silently score against the wrong bowler's baseline.

## Milestone 2 — On-device pose extraction
- [ ] MediaPipe Pose Landmarker integrated via a vision-camera frame processor
- [ ] Per-frame landmarks (knee/hip/ankle/shoulder/wrist + confidence) extracted for the recorded window, matching the `KeypointFrame`/`Landmark` schema `services/coaching-api/src/schemas/delivery.py` already defines
- [ ] Raw video discarded after extraction — never written to persistent storage, never uploaded (PRD §10 Ephemeral Video Pipeline invariant)

## Milestone 3 — Ingestion + verdict display
- [ ] POST to `/api/v1/sessions/delivery` with `raw_keypoints` + `capture_metadata`, using the same auth (Supabase Auth JWT) as the dashboard
- [ ] Render the returned coaching card: status, angle/delta, `trigger_context_deltas` behind a "why" disclosure
- [ ] Nudge FFS control (`POST /api/v1/deliveries/{id}/nudge-ffs`)

## Milestone 4 — Polish / demo readiness
- [ ] Athlete selection (existing `/api/v1/athletes` data, not built new here)
- [ ] Error states: low-confidence/`DATA_SUPPRESSED` capture → reshoot prompt, network failure → retry
- [ ] Demo walkthrough script/checklist for the actual device

## Dead End Registry

(empty — nothing tried-and-abandoned yet)

## Notes on resolved conflicts

- **Web-only vs. native**: `FRONTEND_PLAN.md` (frontend workstream) frames CoachLens as web-only with no install. This plan reverses that for the capture flow specifically, per explicit decision on 2026-09-12: browser camera APIs cannot deliver manual shutter/exposure control or reliable 120fps, and cannot do on-device pose extraction (video would have to be uploaded and processed server-side, breaking the Ephemeral Video Pipeline invariant). The public marketing site (`apps/web`) is unaffected by this — it remains a web app; only delivery *capture* moves to native.
