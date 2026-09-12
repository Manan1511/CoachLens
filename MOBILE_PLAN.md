# CoachLens — Mobile Capture App: Implementation Plan

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked/skipped (explain in Dead End Registry if abandoned)

Companion docs: [`DESIGN.md`](DESIGN.md) (visual language, written for the web site — §4 below records what carries over), [`BACKEND_PLAN.md`](BACKEND_PLAN.md) (the API this app consumes), [`FRONTEND_PLAN.md`](FRONTEND_PLAN.md) (marketing site, separate workstream).

## 1. Why this app exists

The PRD's capture-quality targets — shutter ≤1/1000s, 60/120fps, on-device pose extraction so raw video never leaves the phone — cannot be met by a browser. Web camera APIs expose no manual shutter/exposure control on any platform, iOS Safari exposes none of the advanced `MediaTrackConstraints` at all, and true 120fps capture is a native-only pipeline. A native app is the only way to hit those targets *and* keep the Ephemeral Video Pipeline invariant (PRD §10): only numerical keypoints ever leave the device.

**This reverses `FRONTEND_PLAN.md`'s "web app, not a mobile app" framing**, which lists mobile-app framing in its own Dead End Registry and has already shipped marketing copy ("nothing to install"). The frontend workstream owner must reconcile that positioning — flagged here, not fixed here.

## 2. Scope boundary

This app **captures deliveries**. That's it:

- Guided camera setup, record, on-device pose extraction, post keypoints, show the returned verdict, let the coach nudge the FFS frame or approve/dismiss the drill.
- It is **not** the coach dashboard. No longitudinal history views, no drill library browsing, no baseline-computation workflow, no athlete admin beyond picking who's bowling. Those stay web (separate workstream).
- The backend contract does not change for this app. It is a new consumer of endpoints `services/coaching-api` already exposes.

## 3. Stack

| Concern | Choice |
|---|---|
| Framework | **Expo SDK 57** (`expo ~57.0.22`, RN 0.86.3, React 19.2.3), managed workflow + **custom dev client** |
| Build | **EAS Build** (cloud). This machine has no Android Studio/SDK/JDK17, so local Gradle builds aren't possible; only `adb` + a physical device are needed to install |
| Platform | **Android first.** iOS needs a Mac/Xcode regardless of framework — deferred, not abandoned |
| Camera | `react-native-vision-camera` v4 (frame processors, format selection for fps/resolution) |
| Pose | MediaPipe Pose Landmarker (BlazePose, 33 landmarks) via a Vision Camera frame-processor plugin — see the §7 spike, this is the project's biggest unverified assumption |
| Animation | `react-native-reanimated` — **not** GSAP/Lenis (web-only; see §4) |
| Auth | `@supabase/supabase-js` with `expo-secure-store` for refresh-token persistence |
| Fonts | Inter via `@expo-google-fonts/inter` |

Expo's own template ships `AGENTS.md` telling contributors to read the versioned docs at `docs.expo.dev/versions/v57.0.0/` before writing code — SDK 57 is recent enough that older tutorials will be wrong.

## 4. Design language: what carries over from DESIGN.md

`DESIGN.md` documents the **marketing site's** language. Much of it is a narrative scroll experience and does not apply to a tool used one-handed at a cricket net. Recording the split explicitly so neither side drifts.

### Carries over
- **Pure black canvas** (`#000000`), `#0c0c0c` surfaces, **hairline borders as the only elevation** — no card fills, no drop shadows (invisible on black anyway).
- **Weight inversion** — large numerals/statements at weight 400; small labels bold, uppercase, wide-tracked. This is the single rule that makes the app look like CoachLens rather than a generic utility.
- **Inter**, one family.
- **Status colours are semantic only** (`#5fd39b` / `#e5b85c` / `#f0776c`) and map 1:1 to verdict states. Never decorative.
- **No second accent.** DESIGN.md scopes `accent-blue` to the web vision section only — it appears nowhere in this app.
- **The centred-wordmark moment** — reused once, as the app's launch screen, for brand continuity with the site's intro. Not repeated anywhere else.

### Deliberately departed from
- **Motion stack.** GSAP + Lenis + ScrollTrigger are web-only. Reanimated instead. Every scroll-driven pattern in DESIGN.md §3 (pinned accumulation, scroll-scrubbed word highlight, the semicircular step arc, draw-on stroke) is a *marketing narrative device* — a capture tool has no scroll narrative. Dropped, not ported.
- **Imagery rules (DESIGN.md §5).** The live camera preview is neither "dimmed grayscale texture behind type" nor "a contrast diagram" — it's the primary interactive surface at full brightness, and its brightness is uncontrollable (it's the real world). Overlays drawn on top of it therefore need their own legibility treatment (scrim behind text, stroked skeleton lines), which the web palette never had to solve.
- **The dim/muted text ramp.** This is the important one. DESIGN.md sets `ink-dim` at 44% white and `ink-muted` at 20% white, and `FRONTEND_PLAN.md` *already* flags 44% as "borderline for small text" — indoors, on a desk. This app is used **outdoors in daylight at a cricket net**. 20% white on black will be invisible in sun. The app raises the floor of that ramp (proposal: dim ≥ 60%, muted ≥ 35%) and treats it as a documented deviation rather than a violation. Verify on a real phone in real sunlight, not in a simulator.
- **Two-breakpoint responsive system.** Irrelevant; replaced by safe-area handling and an orientation decision (§9).

### Mobile-only additions
- **Status is never encoded by colour alone** — always colour + text label + a distinct shape/icon. Sunlight washes out hue, and the green/yellow/red set is the worst case for red-green colour blindness.
- **Glanceability budget**: the coach reads the verdict standing over a tripod-mounted phone at ~1.1m, in sun, in the few seconds before the next delivery. Primary verdict must be legible in ~2 seconds at arm's length. That means a very large status word and angle numeral, with everything else demoted.
- **Large touch targets** (≥56dp) — sweaty/chalky hands, possibly gloves, no precision available.

## 5. Screens

1. **Launch** — centred wordmark moment, then straight into auth check.
2. **Sign in** — Supabase Auth email/password. Token persisted; this screen should be seen once per device, not per session.
3. **Bowler select** — list of athletes, search, "add bowler", and the *current* bowler shown prominently. On selection, `POST /api/v1/athletes/{id}/sessions` → hold the returned `session_id`.
4. **Capture** — live preview, alignment overlay, achieved-fps/format readout, record control, and a **persistent current-bowler chip that is always visible and always tappable to switch** (never a buried setting).
5. **Verdict** — the coaching card: status, observed angle, delta vs baseline, "why was this flagged?" disclosure (`trigger_context_deltas`), the proposed drill when present (`TECHNICAL_CONCERN` only), the non-diagnostic disclaimer, and controls for Nudge FFS ±1 and approve/dismiss.
6. **Reshoot prompt** — the `DATA_SUPPRESSED` path. Not an error dialog: a specific, actionable "the camera couldn't see the bowler clearly — here's what to fix" screen.

## 6. Data contract — two real gotchas

The app must produce `raw_keypoints` matching `services/coaching-api/src/schemas/delivery.py` (`KeypointFrame`: `frame`, `t_ms`, and `knee`/`hip`/`ankle` plus optional `shoulder`/`wrist`, each `{x, y, conf}`). Mapping MediaPipe's output onto that is not a straight copy:

- **Aspect-ratio distortion (correctness bug if missed).** MediaPipe returns normalized landmarks — `x` divided by frame *width*, `y` by frame *height*. The backend computes joint angles as the angle between vectors (knee→hip, knee→ankle). On a non-square frame those two normalizations have different scales, so a limb at a true 45° arrives as some other angle, and the backend has no way to detect it — it just returns a plausible, wrong number, which then gets compared against a baseline and flagged or not. **The app must convert to a uniform pixel space (multiply by actual frame width/height) before sending.** Add a test with a known synthetic geometry that asserts the round-trip angle, and check it against `angles.py`'s own geometry tests.
- **Which leg is the "front" leg.** MediaPipe gives left *and* right landmarks (33 of them); the backend schema takes exactly one `knee`/`hip`/`ankle`. Front-foot strike is the *front* leg, which depends on the bowler's bowling arm and which side they're filmed from. Nothing in the current schema or the athletes table records bowling arm. Options: (a) add `bowling_arm` to the athlete profile (backend change), (b) let the coach pick side during setup, (c) infer from which ankle is further downfield at plant. (a) is the most robust and cheapest to reason about. **Needs a decision — §9.**
- **Confidence semantics.** BlazePose exposes per-landmark `visibility` *and* `presence`; the backend's quality firewall thresholds a single `conf` at `< 0.70`. Which one maps to `conf` changes what gets suppressed, so pick deliberately and write it down — don't let it be an accident of whichever field the plugin happens to surface.

## 7. Milestones

### Milestone 0 — Scaffold
- [x] `apps/mobile/` Expo TypeScript project created (SDK 57)
- [x] Dependencies installed (first `npm install` failed on a network `ECONNRESET`; clean reinstall succeeded)
- [ ] `expo-dev-client` + EAS configured (`eas.json`, dev-client build profile in `app.json`)
- [ ] First EAS Android build installs on a physical device via `adb install`
- [x] `.gitignore` covers `node_modules/`, `.expo/`, `/android`, `/ios`, keystores (Expo template default)

### Milestone 0.5 — Pose-extraction spike (**do this before anything else**)
The riskiest assumption in the whole plan, proven or disproven before UI work is built on top of it. Vision Camera frame processors need `react-native-worklets-core` and a babel plugin, and compatibility with RN 0.86 / React 19 / New Architecture is **not verified** — candidate paths exist ([`react-native-mediapipe-posedetection`](https://github.com/EndLess728/react-native-mediapipe-posedetection), New-Architecture-only, 33 landmarks + GPU; [`react-native-mediapipe`](https://cdiddy77.github.io/react-native-mediapipe/docs/api_pages/pose-landmark-detection/); or a custom Kotlin frame-processor plugin) but none is confirmed against this SDK.
- [ ] Get *any* per-frame pose landmarks out of a live camera feed in a dev-client build on a real device
- [ ] Measure achieved fps with inference running (the PRD wants 60/120; if the pipeline can only sustain 30, that's a finding that changes the product, and it should surface now rather than at demo time)
- [ ] If no plugin works on SDK 57: record it in the Dead End Registry and evaluate fallbacks (custom Expo module, or pinning to an older SDK) before proceeding

### Milestone 1 — Capture + guided setup
- [ ] Camera permission flow
- [ ] Alignment/stencil overlay for the PRD capture constraints (2.8–3.2m distance, 1.1m tripod height, roll/pitch <3°) — roll/pitch from device sensors (`expo-sensors`), distance and height are coach-entered or eyeballed against the stencil, not measurable by the phone
- [ ] Best-effort format selection for fps/resolution, with the **actually-granted** values shown, never the requested ones
- [ ] **Current-bowler selector + quick-switch.** One coach, one phone, several bowlers taking turns. The app always has an explicit "who's bowling now" — never inferred from the last recording — and switching is a single tap from the capture screen. Each switch calls `POST /api/v1/athletes/{id}/sessions` and uses the returned `session_id` for every delivery until the next switch. (`BACKEND_PLAN.md` Milestone 8 covers why: a stale `session_id` after a switch used to silently score against the wrong bowler's baseline. Athlete identity is now resolved server-side from `session_id`, so the app sending the right session is the *only* thing keeping attribution correct.)

### Milestone 2 — Extraction → contract
- [ ] Landmarks for the recorded window mapped to `KeypointFrame`, including the pixel-space conversion and front-leg selection from §6
- [ ] Raw video never written to persistent storage and never uploaded (PRD §10)
- [ ] Unit test: synthetic known geometry → expected angle, cross-checked against the backend's own `angles.py` expectations

### Milestone 3 — Ingestion + verdict
- [ ] `POST /api/v1/sessions/delivery` with the Supabase JWT attached
- [ ] Verdict card rendering all four statuses, with the "why was this flagged?" disclosure
- [ ] Nudge FFS ±1 (`POST /api/v1/deliveries/{id}/nudge-ffs`) and approve/dismiss (`POST /api/v1/deliveries/{id}/action`)
- [ ] Error mapping: 403 `ERR_CONSENT_REQUIRED` (unconsented minor), 422 `ERR_UNKNOWN_BASELINE` (no baseline confirmed yet — a likely first-run state, so it needs a real explanatory screen, not a raw error), 422 `ERR_THERMAL_THROTTLE`, 401 (re-auth)

### Milestone 4 — Field resilience
- [ ] **Offline queue.** Cricket nets have poor connectivity; keypoint payloads are small JSON (tens of KB), so queue-and-retry is cheap and high-value. A delivery captured out of signal must not be lost.
- [ ] Thermal degradation handling — continuous camera + on-device inference heats phones fast, and the backend already has a `ThermalThrottleError`. At minimum, watch for achieved-fps collapse and warn before the data quality silently drops.
- [ ] Battery: the capture screen holds the camera open; make that cost visible/interruptible rather than surprising.

### Milestone 5 — Demo readiness
- [ ] End-to-end on a real device against the deployed API, walked through the same 5-delivery narrative as `scripts/demo_walkthrough.py`
- [ ] Sunlight legibility check on real hardware outdoors (§4)
- [ ] Device checklist: which phone, which Android version, dev-client APK installed, tripod, tape measure

## 8. Backend dependencies (blocking, not yet built)

- **`GET /api/v1/athletes`** — list athletes for the bowler selector. Does not exist.
- **`POST /api/v1/athletes`** — register a bowler, including `dob` and `guardian_consent` (the consent gate blocks minors without it, so registration must capture it or the app will hit 403s it can't resolve). Does not exist.
- **`bowling_arm` on the athlete profile** — needed for front-leg selection (§6), pending the §9 decision.
- Baseline confirmation is a coach/dashboard workflow, but **a bowler with no confirmed baseline gets 422 on every delivery**. Either the app needs a path into baseline confirmation, or the demo flow must guarantee baselines exist first. Unresolved.

## 9. Open decisions

1. **Who touches the phone, and when?** The phone sits on a tripod 2.8–3.2m from the bowler at 1.1m. The coach can't simultaneously be at the crease and behind the phone. Walk to the phone between deliveries (simple, slow), auto-record on detected motion (no touching, much harder, risks garbage captures), or a remote trigger/second device (extra hardware)? This shapes the entire capture UI and is the biggest open question.
2. **Front-leg selection** — add `bowling_arm` to the athlete profile, ask during setup, or infer at plant? (§6)
3. **Orientation** — capture is inherently landscape (side-on sagittal view); verdict/list screens read better portrait. Lock capture landscape and allow portrait elsewhere, or lock the app to one?
4. **First-run baseline** — how does a brand-new bowler get past `ERR_UNKNOWN_BASELINE` without leaving the app? (§8)

## Dead End Registry

*(empty — add an entry whenever an approach is tried and dropped: what was tried, why it failed, what replaced it.)*

## Notes on resolved conflicts

- **Web-only vs. native** (decided 2026-09-12): `FRONTEND_PLAN.md` frames CoachLens as web-only with nothing to install. Reversed for **capture specifically** — browser APIs can't deliver manual shutter/exposure or reliable 120fps, and can't do on-device extraction (video would have to be uploaded and processed server-side, breaking PRD §10's Ephemeral Video Pipeline invariant and reintroducing the cloud-GPU cost `BACKEND_PLAN.md` Milestone 7 explicitly declined). The marketing site stays a web app; only delivery capture moves native.
- **Design system scope**: `DESIGN.md` is the web site's language. §4 above is the authority for what applies on mobile, including the deliberate contrast-ramp deviation for outdoor use.
