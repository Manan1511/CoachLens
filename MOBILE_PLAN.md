# CoachLens — Mobile Capture App: Implementation Plan

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked/skipped (explain in Dead End Registry if abandoned)

Companion docs: [`DESIGN.md`](DESIGN.md) (visual language, written for the web site — §4 below records what carries over), [`BACKEND_PLAN.md`](BACKEND_PLAN.md) (the API this app consumes), [`FRONTEND_PLAN.md`](FRONTEND_PLAN.md) (marketing site, separate workstream).

## 1. Why this app exists

The PRD's capture-quality targets — shutter ≤1/1000s, 60/120fps, on-device pose extraction so raw video never leaves the phone — cannot be met by a browser. Web camera APIs expose no manual shutter/exposure control on any platform, iOS Safari exposes none of the advanced `MediaTrackConstraints` at all, and true 120fps capture is a native-only pipeline. A native app is the only way to hit those targets *and* keep the Ephemeral Video Pipeline invariant (PRD §10): only numerical keypoints ever leave the device.

**This reverses `FRONTEND_PLAN.md`'s "web app, not a mobile app" framing**, which lists mobile-app framing in its own Dead End Registry and has already shipped marketing copy ("nothing to install"). The frontend workstream owner must reconcile that positioning — flagged here, not fixed here.

## 2. Scope boundary

This app **captures deliveries**. That's it:

- Guided camera setup, record, on-device pose extraction, post keypoints, show the returned verdict, and let the FFS frame be nudged if the app picked the wrong contact frame.
- It is **not** the coach dashboard. **Drill approve/dismiss and adding players both live in the dashboard, not here** — along with longitudinal history, drill library browsing, and the baseline-confirmation workflow. The app only ever *selects* from players the dashboard already created. Those stay web (separate workstream).
- The backend contract does not change for this app. It is a new consumer of endpoints `services/coaching-api` already exposes.

## 3. Stack

| Concern | Choice |
|---|---|
| Framework | **Expo SDK 57** (`expo ~57.0.22`, RN 0.86.3, React 19.2.3), managed workflow + **custom dev client** |
| Build | **EAS Build** (cloud). This machine has no Android Studio/SDK/JDK17, so local Gradle builds aren't possible; only `adb` + a physical device are needed to install |
| Platform | **Android first.** iOS needs a Mac/Xcode regardless of framework — deferred, not abandoned |
| Camera | `react-native-vision-camera` v4 (frame processors, format selection for fps/resolution) |
| Pose | MediaPipe Pose Landmarker (BlazePose, 33 landmarks) via a Vision Camera frame-processor plugin — see the §8 spike, this is the project's biggest unverified assumption |
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
- **Two-breakpoint responsive system.** Irrelevant; replaced by safe-area handling and an orientation decision (§10).

### Mobile-only additions
- **Status is never encoded by colour alone** — always colour + text label + a distinct shape/icon. Sunlight washes out hue, and the green/yellow/red set is the worst case for red-green colour blindness.
- **Glanceability budget**: the coach reads the verdict standing over a tripod-mounted phone at ~1.1m, in sun, in the few seconds before the next delivery. Primary verdict must be legible in ~2 seconds at arm's length. That means a very large status word and angle numeral, with everything else demoted.
- **Large touch targets** (≥56dp) — sweaty/chalky hands, possibly gloves, no precision available.

## 5. Screens

Deliberately few. The app is **one working screen** plus the things that lead into it and out of it.

1. **Launch** — centred wordmark moment, then straight into auth check.
2. **Sign in** — Supabase Auth email/password. Token persisted; seen once per device, not once per session.
3. **Session setup — who's here today.** Before recording starts, pick the players involved in this session from the club roster (`GET /api/v1/athletes`). This is the **session pool**: typically 3–5 people actually at the nets, not the whole roster. Editable mid-session (people arrive late), and persisted locally so an app restart doesn't force a re-pick.
4. **Capture — the one working screen.** Live preview, alignment overlay, achieved-fps/format readout, record control, and a **quick-select strip of the session pool**: whoever is about to bowl taps their name, then bowls. Pool members only — no search, no scrolling, no roster. The selected name is displayed large enough that a wrong pick is obvious *before* the delivery, not after.
5. **Verdict** — shown after each delivery: status, observed angle, delta vs baseline, "why was this flagged?" disclosure (`trigger_context_deltas`), the proposed drill text when present (`TECHNICAL_CONCERN` only), the non-diagnostic disclaimer, and Nudge FFS ±1. **Read-only otherwise — no approve/dismiss (§6).**
6. **Reshoot prompt** — the `DATA_SUPPRESSED` path. Not an error dialog: a specific, actionable "the camera couldn't see the bowler clearly — here's what to fix" screen.

No player-registration screen: players come from the dashboard (§2). The app reads the roster, it never writes to it.

## 6. Operating model

Decided 2026-09-12: the phone stays on the tripod and is operated by hand between deliveries — the coach walks to it, or **the bowler taps their own name before bowling**. No auto-record, no remote trigger, no second device.

**Session pool, then quick-select.** Two levels, deliberately: the roster lives in the dashboard, the *session pool* is chosen once at the start of a nets session, and the quick-select during capture only ever offers that pool. This is what makes tapping-your-own-name viable — choosing between 3–5 large name targets is a one-second action that a bowler can do correctly while walking past, where a searchable 40-player roster is neither fast nor safe. It also narrows the exposure floor: a bowler sees only the names of people already standing at the nets with them.

**Resolve every pool member's `session_id` at setup, not at selection.** `POST /api/v1/athletes/{id}/sessions` is called once per pool member when the pool is confirmed — a handful of calls at a moment when nobody is waiting and signal is likelier to be usable — and the results are held locally. Quick-select during capture is then pure local state with no network round-trip, so switching bowlers can't stall between deliveries or fail outright in a dead spot. Doing it lazily on first selection would put a network call in the one place that must never block.

**Drill approve/dismiss is not in this app.** It belongs to the dashboard. That's the right split for its own reasons — the coach reviews prescriptions deliberately, not standing at a tripod mid-session — and it also removes a problem rather than gating one: `POST /api/v1/deliveries/{id}/action` writes `coach_actions.coach_id` from the signed-in coach's JWT, so a button reachable by whoever walks up to the phone could enter an approval attributed to the coach, forging the audit trail that column exists to establish (`BACKEND_PLAN.md` Milestone 7). With the surface absent, no gate, PIN, or mode-switching is needed anywhere in this app — don't add one later without revisiting this.

Nudge FFS stays: it's a measurement correction, re-derivable and attributed to nobody, and it's only useful at the moment of capture.

Because the app shows only the current delivery's verdict and no history, a bowler at the phone sees their own result and the pool's names — nothing more. That's an acceptable exposure floor for a shared net-side device, and it holds only as long as history/browsing stays out of this app.

**Mis-selection is the residual attribution risk.** The backend resolves athlete identity from `session_id` (`BACKEND_PLAN.md` Milestone 8), so tapping the wrong name yields a delivery correctly scored against the *wrong person's* baseline — internally consistent, entirely wrong, and undetectable downstream. The pool shrinks the odds a lot; it doesn't eliminate them. Hence the large selected-name display in Milestone 1: make the error visible in the moment, not weeks later in a trend line.

## 7. Data contract — two real gotchas

The app must produce `raw_keypoints` matching `services/coaching-api/src/schemas/delivery.py` (`KeypointFrame`: `frame`, `t_ms`, and `knee`/`hip`/`ankle` plus optional `shoulder`/`wrist`, each `{x, y, conf}`). Mapping MediaPipe's output onto that is not a straight copy:

- **Aspect-ratio distortion (correctness bug if missed).** MediaPipe returns normalized landmarks — `x` divided by frame *width*, `y` by frame *height*. The backend computes joint angles as the angle between vectors (knee→hip, knee→ankle). On a non-square frame those two normalizations have different scales, so a limb at a true 45° arrives as some other angle, and the backend has no way to detect it — it just returns a plausible, wrong number, which then gets compared against a baseline and flagged or not. **The app must convert to a uniform pixel space (multiply by actual frame width/height) before sending.** Add a test with a known synthetic geometry that asserts the round-trip angle, and check it against `angles.py`'s own geometry tests.
- **Which leg is the "front" leg.** MediaPipe gives left *and* right landmarks (33 of them); the backend schema takes exactly one `knee`/`hip`/`ankle`. **Resolved 2026-09-12**: the dashboard captures `bowling_arm` when the coach adds a player, and the app reads it off the athlete record. The mapping is deterministic — a right-arm bowler lands on the **left** leg at front-foot strike, a left-arm bowler on the **right** — and MediaPipe's left/right labels are *anatomical* (it infers the subject's own sides), so bowling arm alone is enough; the app does not additionally need to know which side the camera sits on.
  - **But it does affect capture quality.** If the camera is on the bowler's far side, the front leg is the *occluded* one, and a perfectly side-on sagittal view — exactly CoachLens's setup — is where BlazePose's left/right disambiguation is least reliable and far-side visibility is lowest. So the app should use `bowling_arm` to tell the coach **which side to set the tripod on**: film from the side the front leg is nearest to (bowler's left for a right-arm bowler). That's a guided-setup win the app gets for free from data the dashboard is already collecting. Sanity-check the chosen limb's visibility rather than trusting the label blindly — the `conf < 0.70` quality firewall may already catch the occluded case, which is worth confirming during the §8 spike.
- **Confidence semantics.** BlazePose exposes per-landmark `visibility` *and* `presence`; the backend's quality firewall thresholds a single `conf` at `< 0.70`. Which one maps to `conf` changes what gets suppressed, so pick deliberately and write it down — don't let it be an accident of whichever field the plugin happens to surface.

## 8. Milestones

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
- [ ] **Session pool selection** — pick who's at the nets from the roster, resolve every member's `session_id` up front via `POST /api/v1/athletes/{id}/sessions`, hold locally, allow mid-session edits, survive an app restart (§6)
- [ ] **Quick-select strip on the capture screen.** Pool members only; whoever is up taps their name before bowling. The app always has an explicit "who's bowling now" — never inferred from the last recording — and selecting is one local-state tap with no network call. Selected name rendered large (§6: mis-selection is silent and undetectable downstream).
- [ ] **Tripod-side guidance from `bowling_arm`** — tell the coach which side to film from so the front leg is the near, unoccluded one (§7) (`BACKEND_PLAN.md` Milestone 8 covers why: a stale `session_id` after a switch used to silently score against the wrong bowler's baseline. Athlete identity is now resolved server-side from `session_id`, so the app sending the right session is the *only* thing keeping attribution correct.)

### Milestone 2 — Extraction → contract
- [ ] Landmarks for the recorded window mapped to `KeypointFrame`, including the pixel-space conversion and front-leg selection from §7
- [ ] Raw video never written to persistent storage and never uploaded (PRD §10)
- [ ] Unit test: synthetic known geometry → expected angle, cross-checked against the backend's own `angles.py` expectations

### Milestone 3 — Ingestion + verdict
- [ ] `POST /api/v1/sessions/delivery` with the Supabase JWT attached
- [ ] Verdict card rendering all four statuses, with the "why was this flagged?" disclosure
- [ ] Nudge FFS ±1 (`POST /api/v1/deliveries/{id}/nudge-ffs`). **Not** `/action` — approve/dismiss is dashboard-only (§6)
- [ ] Error mapping: 403 `ERR_CONSENT_REQUIRED` (unconsented minor), 422 `ERR_UNKNOWN_BASELINE` (no baseline confirmed yet — a likely first-run state, so it needs a real explanatory screen, not a raw error), 422 `ERR_THERMAL_THROTTLE`, 401 (re-auth)

### Milestone 4 — Field resilience
- [ ] **Offline queue.** Cricket nets have poor connectivity; keypoint payloads are small JSON (tens of KB), so queue-and-retry is cheap and high-value. A delivery captured out of signal must not be lost.
- [ ] Thermal degradation handling — continuous camera + on-device inference heats phones fast, and the backend already has a `ThermalThrottleError`. At minimum, watch for achieved-fps collapse and warn before the data quality silently drops.
- [ ] Battery: the capture screen holds the camera open; make that cost visible/interruptible rather than surprising.

### Milestone 5 — Demo readiness
- [ ] End-to-end on a real device against the deployed API, walked through the same 5-delivery narrative as `scripts/demo_walkthrough.py`
- [ ] Sunlight legibility check on real hardware outdoors (§4)
- [ ] Device checklist: which phone, which Android version, dev-client APK installed, tripod, tape measure

## 9. Dependencies outside this app (all currently missing)

The app's flow now rests on work owned elsewhere. Listing it plainly because this is the kind of cross-workstream chain that sinks a demo quietly.

**Backend — done** (`BACKEND_PLAN.md` Milestone 9):
- [x] **`GET /api/v1/athletes`** — name-ordered roster for pool selection, returning `bowling_arm` and `consent_blocked` (so the selector can show an unconsented minor as unavailable rather than failing at record time). Omits `dob` by design — this list is read on a shared net-side phone.
- [x] **`POST /api/v1/athletes`** — registration for the dashboard, `bowling_arm` required.
- [x] **`bowling_arm` on `athletes`** — migration applied. Nullable only for legacy rows; a client must treat null as a setup error, never guess a side.
- [x] Mid-session join needs nothing new — `POST /athletes/{id}/sessions` is get-or-create, so adding a late arrival to the pool works at any point.
- Note: the roster is **not** scoped per coach (no ownership column on `athletes`), so every coach sees every athlete. Fine for one club; flagged in Milestone 9.

**Dashboard — and this is the sharp edge:** players are created in the dashboard, with `bowling_arm`, `dob` and `guardian_consent`. **The dashboard does not exist.** `apps/web/src/routes/DashboardPlaceholder.tsx` renders "Not built yet" and explicitly "talks to no API"; `FRONTEND_PLAN.md`'s Milestone 7 ("Dashboard starts as its own app") is unstarted. So today there is *no* way to create a player the mobile app can use, and `dob`/`guardian_consent` matter directly: the consent gate 403s minors without consent on file, and the app has no screen to resolve that.

For the demo this needs one of: the existing `scripts/seed.py` path extended to create the demo pool (cheapest), a minimal player-creation form in the dashboard (correct, but it's another workstream's Milestone 7), or a temporary creation path in the app (contradicts §2 — only if the first two are impossible).

**Also unresolved:** baseline confirmation is a dashboard workflow, but **a bowler with no confirmed baseline gets `ERR_UNKNOWN_BASELINE` (422) on every delivery** — the default state for every newly created player. Either the demo guarantees baselines exist up front, or the app needs a real explanatory screen for a state it cannot fix (§10.4).

## 10. Open decisions

1. ~~**Who touches the phone, and when?**~~ **Resolved 2026-09-12**: manual at the tripod — the coach walks to it between deliveries, or the bowler taps their own name before bowling. One screen, selector on it, no auto-record, no remote trigger. Approve/dismiss moved to the dashboard as a consequence (§6).
2. ~~**Front-leg selection**~~ **Resolved 2026-09-12**: the dashboard collects `bowling_arm` at player creation; the app reads it and derives the front leg deterministically. Also drives which side to place the tripod (§7).
3. **Orientation** — capture is inherently landscape (side-on sagittal view); verdict/list screens read better portrait. Lock capture landscape and allow portrait elsewhere, or lock the app to one?
4. **First-run baseline** — how does a brand-new bowler get past `ERR_UNKNOWN_BASELINE` without leaving the app? (§9)
5. ~~**Coach-mode gate mechanism**~~ **Dropped 2026-09-12** — moot once approve/dismiss moved to the dashboard. No modes, no gate, no PIN in this app (§6).

## Dead End Registry

*(empty — add an entry whenever an approach is tried and dropped: what was tried, why it failed, what replaced it.)*

## Notes on resolved conflicts

- **Web-only vs. native** (decided 2026-09-12): `FRONTEND_PLAN.md` frames CoachLens as web-only with nothing to install. Reversed for **capture specifically** — browser APIs can't deliver manual shutter/exposure or reliable 120fps, and can't do on-device extraction (video would have to be uploaded and processed server-side, breaking PRD §10's Ephemeral Video Pipeline invariant and reintroducing the cloud-GPU cost `BACKEND_PLAN.md` Milestone 7 explicitly declined). The marketing site stays a web app; only delivery capture moves native.
- **Design system scope**: `DESIGN.md` is the web site's language. §4 above is the authority for what applies on mobile, including the deliberate contrast-ramp deviation for outdoor use.
