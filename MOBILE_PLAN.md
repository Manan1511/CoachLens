# CoachLens — Mobile Capture App: Implementation Plan

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked/skipped (explain in Dead End Registry if abandoned)

Companion docs: [`DESIGN.md`](DESIGN.md) (visual language, written for the web site — §4 records what carries over), [`BACKEND_PLAN.md`](BACKEND_PLAN.md) (the API this app consumes), [`FRONTEND_PLAN.md`](FRONTEND_PLAN.md) (marketing site, separate workstream).

## 1. Why this app exists

Two of the PRD's requirements are unreachable in a browser, and one is reachable but only natively:

- **On-device pose extraction** (PRD §10's Ephemeral Video Pipeline — only numerical keypoints ever leave the device). A browser upload flow would have to ship video to a server and extract there, reintroducing exactly the cloud-GPU cost and youth-video-exposure risk `BACKEND_PLAN.md` Milestone 7 explicitly declined. **This is the strongest reason for going native, and it is unconditional.**
- **60/120fps capture.** iOS's high-frame-rate pipeline isn't exposed to web content at all; Android browsers negotiate best-effort and rarely exceed 30. Native format selection can request it properly.
- **Shutter ≤1/1000s — with a caveat that changes the plan (§3).** Native camera APIs (Camera2 `SENSOR_EXPOSURE_TIME`, AVFoundation) do support manual exposure duration. **`react-native-vision-camera` does not expose it.** Its `exposure` prop is EV *bias* only — it premultiplies onto continuously auto-adjusted ISO and exposure duration, and manual ISO/shutter is an open feature request ([exposure docs](https://react-native-vision-camera.com/docs/guides/exposure), [#3670](https://github.com/mrousavy/react-native-vision-camera/issues/3670)). So on the chosen stack this target is *not* met out of the box, and "we went native for shutter control" would be an overclaim until §8's spike says otherwise.

**This reverses `FRONTEND_PLAN.md`'s "web app, not a mobile app" framing**, which lists mobile-app framing in its own Dead End Registry and has already shipped marketing copy ("nothing to install"). The frontend workstream owner must reconcile that positioning — flagged here, not fixed here.

## 2. Scope boundary

This app **captures deliveries**. That's it:

- Guided camera setup, record, on-device pose extraction, post keypoints, show the returned verdict, and let the FFS frame be nudged if the app picked the wrong contact frame.
- It is **not** the coach dashboard. **Drill approve/dismiss and adding players both live in the dashboard, not here** — along with longitudinal history, drill library browsing, and the baseline-confirmation workflow. The app only ever *selects* from players the dashboard already created.
- The backend contract does not change for this app. It is a new consumer of endpoints `services/coaching-api` already exposes. (Two small backend changes are *recommended* by this review — §10 — but nothing here is blocked on them.)

## 3. Stack

| Concern | Choice |
|---|---|
| Framework | **Expo SDK 57** (`expo ~57.0.22`, RN 0.86.3, React 19.2.3), managed workflow + **custom dev client** |
| Build | **EAS Build** (cloud). This machine has no Android Studio/SDK/JDK17, so local Gradle builds aren't possible; only `adb` + a physical device are needed to install |
| Platform | **Android first.** iOS needs a Mac/Xcode regardless of framework — deferred, not abandoned |
| Orientation | **Landscape, locked, app-wide** (§10.3) |
| Camera | `react-native-vision-camera` v4 — format selection for fps/resolution; **EV bias only, no manual shutter** (§1) |
| Pose | MediaPipe Pose Landmarker (BlazePose, 33 landmarks). **Buffered post-capture extraction, not real-time frame processing** (§8) |
| Animation | `react-native-reanimated` — **not** GSAP/Lenis (web-only; see §4) |
| Auth | `@supabase/supabase-js` with `expo-secure-store` for refresh-token persistence |
| Fonts | Inter via `@expo-google-fonts/inter` |

Expo's own template ships `AGENTS.md` telling contributors to read the versioned docs at `docs.expo.dev/versions/v57.0.0/` before writing code — SDK 57 is recent enough that older tutorials will be wrong.

**Motion-blur fallback if manual shutter stays unavailable.** In bright daylight, auto-exposure already selects short exposure durations, and biasing EV negative pushes it shorter still — an indirect, unguaranteed lever, but a real one. Whether it's *sufficient* is an empirical question: film a fast-moving limb, inspect blur, and check whether keypoint confidence holds up. Measure it in the spike; don't assume either way. If it isn't enough, the escalation is a custom Camera2 module setting `SENSOR_EXPOSURE_TIME` with `CONTROL_AE_MODE_OFF`, which is real work and should be a deliberate decision, not a surprise.

## 4. Design language: what carries over from DESIGN.md

`DESIGN.md` documents the **marketing site's** language. Much of it is a narrative scroll experience and does not apply to a tool used at a cricket net. Recording the split explicitly so neither side drifts.

### Carries over
- **Pure black canvas** (`#000000`), `#0c0c0c` surfaces, **hairline borders as the only elevation** — no card fills, no drop shadows (invisible on black anyway).
- **Weight inversion** — large numerals/statements at weight 400; small labels bold, uppercase, wide-tracked. This is the single rule that makes the app look like CoachLens rather than a generic utility.
- **Inter**, one family.
- **Status colours are semantic only** (`#5fd39b` / `#e5b85c` / `#f0776c`) and map 1:1 to verdict states. Never decorative.
- **No second accent.** DESIGN.md scopes `accent-blue` to the web vision section only — it appears nowhere in this app.
- **The centred-wordmark moment** — reused once, as the app's launch screen, for brand continuity with the site's intro. Not repeated anywhere else.

### Deliberately departed from
- **Motion stack.** GSAP + Lenis + ScrollTrigger are web-only. Reanimated instead. Every scroll-driven pattern in DESIGN.md §3 (pinned accumulation, scroll-scrubbed word highlight, the semicircular step arc, draw-on stroke) is a *marketing narrative device* — a capture tool has no scroll narrative. Dropped, not ported.
- **Imagery rules (DESIGN.md §5).** The live camera preview is neither "dimmed grayscale texture behind type" nor "a contrast diagram" — it's the primary interactive surface at full brightness, and that brightness is uncontrollable (it's the real world). Overlays on top of it need their own legibility treatment (scrim behind text, stroked skeleton lines), which the web palette never had to solve.
- **The dim/muted text ramp.** DESIGN.md sets `ink-dim` at 44% white and `ink-muted` at 20% white, and `FRONTEND_PLAN.md` *already* flags 44% as "borderline for small text" — indoors, on a desk. This app is used **outdoors in daylight**. 20% white on black will be invisible in sun. The app raises the floor of that ramp (proposal: dim ≥ 60%, muted ≥ 35%) as a documented deviation rather than a violation. Verify on real hardware in real sunlight, not in a simulator.
- **Two-breakpoint responsive system.** Irrelevant. Replaced by safe-area handling and a single locked orientation (§10.3).

### Mobile-only additions
- **Status is never encoded by colour alone** — always colour + text label + a distinct shape/icon. Sunlight washes out hue, and green/yellow/red is the worst case for red-green colour blindness.
- **Glanceability budget**: the verdict is read standing over a tripod-mounted phone at ~1.1m, in sun, in the seconds before the next delivery. It must be legible in ~2 seconds at arm's length — a very large status word and angle numeral, everything else demoted.
- **Large touch targets** (≥56dp) — sweaty or chalky hands, no precision available.

## 5. Screens

Deliberately few. The app is **one working screen** plus what leads into and out of it. All designed for a **landscape** viewport (§10.3) — wide and short, which suits a large status word beside a large numeral.

1. **Launch** — centred wordmark moment, then straight into auth check.
2. **Sign in** — Supabase Auth email/password. Token persisted; seen once per device, not once per session.
3. **Session setup — who's here today.** Pick the players at this session from the roster (`GET /api/v1/athletes`). This is the **session pool**: typically 3–5 people actually present, not the whole club. Editable mid-session (people arrive late) and persisted locally so an app restart doesn't force a re-pick. Players whose `consent_blocked` is true are shown unavailable here, with the reason — that's the one place it can be explained calmly instead of as a failure mid-session.
4. **Capture — the one working screen.** Live preview, alignment overlay, achieved-fps/format readout, record control, and a **quick-select strip of the session pool**: whoever is about to bowl taps their name, then bowls. Pool members only — no search, no scrolling, no roster. The selected name is large enough that a wrong pick is obvious *before* the delivery, not after.
5. **Verdict** — after each delivery: status, observed angle, delta vs baseline, "why was this flagged?" disclosure (`trigger_context_deltas`), the proposed drill text when present (`TECHNICAL_CONCERN` only), the non-diagnostic disclaimer, and Nudge FFS ±1. **Read-only otherwise — no approve/dismiss (§6).**
6. **Reshoot prompt** — the `DATA_SUPPRESSED` path. Not an error dialog: a specific, actionable "the camera couldn't see the bowler clearly — here's what to fix" screen.
7. **Benchmark-collection state** — what a bowler with no confirmed baseline sees. Currently this is an unavoidable dead end, and it is the sharpest unresolved issue in the plan (§10.4).

No player-registration screen: players come from the dashboard (§2). The app reads the roster, it never writes to it.

## 6. Operating model

Decided 2026-09-12: the phone stays on the tripod and is operated by hand between deliveries — the coach walks to it, or **the bowler taps their own name before bowling**. No auto-record, no remote trigger, no second device.

**Session pool, then quick-select.** Two levels, deliberately: the roster lives in the dashboard, the *session pool* is chosen once at the start of a nets session, and quick-select during capture only ever offers that pool. This is what makes tapping-your-own-name viable — choosing between 3–5 large name targets is a one-second action a bowler can do correctly while walking past, where a searchable 40-player roster is neither fast nor safe. It also narrows the exposure floor: a bowler sees only the names of people already standing at the nets with them.

**Resolve every pool member's `session_id` at setup, not at selection.** `POST /api/v1/athletes/{id}/sessions` is called once per pool member when the pool is confirmed — a handful of calls at a moment when nobody is waiting and signal is likelier to be usable — and the results are held locally. Quick-select is then pure local state with no network round-trip, so switching bowlers can't stall between deliveries or fail outright in a dead spot. Doing it lazily on first selection would put a network call in the one place that must never block.

**Drill approve/dismiss is not in this app.** It belongs to the dashboard. That's the right split on its own merits — a coach reviews prescriptions deliberately, not standing at a tripod mid-session — and it also removes a problem rather than gating one: `POST /api/v1/deliveries/{id}/action` writes `coach_actions.coach_id` from the signed-in coach's JWT, so a button reachable by whoever walks up to the phone could enter an approval attributed to the coach, forging the audit trail that column exists to establish (`BACKEND_PLAN.md` Milestone 7). With the surface absent, no gate, PIN, or mode-switching is needed anywhere in this app — don't add one later without revisiting this.

Nudge FFS stays: it's a measurement correction, re-derivable, attributed to nobody, and only useful at the moment of capture.

Because the app shows only the current delivery's verdict and no history, a bowler at the phone sees their own result and the pool's names — nothing more. That's an acceptable exposure floor for a shared net-side device, and it holds **only as long as history and browsing stay out of this app**.

**Mis-selection is the residual attribution risk.** The backend resolves athlete identity from `session_id` (`BACKEND_PLAN.md` Milestone 8), so tapping the wrong name yields a delivery correctly scored against the *wrong person's* baseline — internally consistent, entirely wrong, and undetectable downstream. The pool shrinks the odds a lot; it doesn't eliminate them. Hence the large selected-name display in Milestone 1: make the error visible in the moment, not weeks later in a trend line.

## 7. Data contract obligations

The app produces `raw_keypoints` + `capture_metadata` matching `services/coaching-api/src/schemas/delivery.py`. Mapping MediaPipe onto that is not a straight copy.

### Landmarks

- **Aspect-ratio distortion — a correctness bug if missed.** MediaPipe returns normalized landmarks: `x` divided by frame *width*, `y` by frame *height*. The backend computes joint angles as the angle between vectors (knee→hip, knee→ankle). On a non-square frame those normalizations have different scales, so a limb at a true 45° arrives as some other angle — and the backend cannot detect it. It returns a plausible, wrong number that then gets compared against a baseline and flagged or not. **Convert to a uniform pixel space (multiply by actual frame width/height) before sending.** Cover it with a synthetic known-geometry test asserting the round-trip angle, checked against `angles.py`'s own geometry expectations.
- **Which leg is the front leg — resolved.** MediaPipe gives left *and* right; the schema takes exactly one `knee`/`hip`/`ankle`. The dashboard captures `bowling_arm` at player creation and the app reads it off the athlete record. The mapping is deterministic — a right-arm bowler lands on the **left** leg at front-foot strike, a left-arm bowler on the **right** — and MediaPipe's labels are *anatomical*, so bowling arm alone resolves it; the app doesn't additionally need to know which side the camera sits on. `bowling_arm` can be null only for legacy rows: treat that as a setup error to fix in the dashboard, never guess a side.
- **Send `shoulder` and `wrist` too.** They're optional in the schema, but the backend evaluates Forward Trunk Tilt concurrently with Front Knee Angle *only when they're present*, and uses `wrist` for release detection. MediaPipe provides both. Omitting them silently forfeits the PRD's second metric — a quiet feature loss, not an error, which is why it's called out as an explicit deliverable rather than left to inference.
- **Confidence semantics.** BlazePose exposes per-landmark `visibility` *and* `presence`; the backend's quality firewall thresholds a single `conf` at `< 0.70`. Which one maps to `conf` changes what gets suppressed. Pick deliberately and write it down — don't let it be an accident of whichever field the plugin happens to surface.
- **Sanity-check the chosen limb's visibility** rather than trusting the anatomical label blindly. A perfectly side-on sagittal view — exactly this setup — is where left/right disambiguation is weakest and far-side visibility lowest. Confirm during the spike whether the `conf < 0.70` firewall already catches the occluded-limb case.

### `capture_metadata` — the app is the only enforcement point

All six fields are required by the schema: `fps`, `pacing_jitter_pct`, `shutter_speed_sec`, `distance_meters`, `tripod_height_meters`, `camera_roll_deg`.

**None of them is read by any backend decision logic.** They're persisted into the `capture_metadata` jsonb and never consulted — `measurement/audit.py` explicitly measures pacing from frame timestamps "rather than trusting a self-reported" value. So the PRD's capture constraints (2.8–3.2m, 1.1m tripod height, roll <3°, shutter ≤1/1000s) are **recorded provenance, not enforced constraints**, anywhere in the system.

That reframes the guided-setup overlay from a nicety into the *only* place those constraints are enforced at all. If the app doesn't hold the line on them, nothing does — and every downstream number silently inherits whatever geometry the coach happened to set up.

Two consequences worth being honest about:
- `distance_meters` and `tripod_height_meters` are not measurable by the phone. They're coach-entered or eyeballed against the stencil, and should be presented as *claims* rather than measurements.
- `shutter_speed_sec` may be genuinely unknowable on this stack (§1). Writing a fabricated `0.001` into a permanent audit record — as `scripts/demo_fixtures.py` does for its synthetic fixtures — would be inventing provenance. Prefer reporting the real exposure duration if the platform surfaces it; otherwise the field should become `float | None` so "unknown" is expressible (§10, recommended backend change).

## 8. Architecture: capture first, extract second

**Do not run pose inference in a real-time frame processor at capture rate.** The PRD wants 60–120fps capture, and BlazePose cannot sustain inference at 120fps on a commodity phone — attempting it means dropped frames, and dropped frames at exactly the moment of front-foot contact are the ones that matter most.

Instead: **capture the delivery window at the highest sustainable frame rate, buffer it, then run extraction over the buffered frames and discard them.** This satisfies both constraints at once — full temporal resolution for FFS detection, and inference that can take as long as it needs per frame.

It also keeps PRD §10 intact, *provided the buffer is treated as hostile*: frames live in memory or an explicitly-temporary location, are deleted immediately after extraction, and are never written to the media store, gallery, or any path that survives the process. "We extracted on-device" is not the invariant; "no video persists" is.

Budget check against the PRD's P50 ≤ 8s: a ~1.5s window at 120fps is ~180 frames. At 20ms/frame that's ~3.6s of extraction, leaving headroom for the round-trip. At 40ms/frame it's ~7.2s and the SLA is at risk. **Measure per-frame inference cost in the spike** — it decides whether 120fps is viable or whether 60fps is the honest ceiling.

## 9. Milestones

### Milestone 0 — Scaffold
- [x] `apps/mobile/` Expo TypeScript project created (SDK 57)
- [x] Dependencies installed (first `npm install` failed on a network `ECONNRESET`; clean reinstall succeeded)
- [x] `.gitignore` covers `node_modules/`, `.expo/`, `/android`, `/ios`, keystores (Expo template default)
- [ ] `expo-dev-client` + EAS configured (`eas.json`, dev-client build profile in `app.json`)
- [ ] First EAS Android build installs on a physical device via `adb install`

### Milestone 0.5 — Capture spike (**do this before anything else**)
The riskiest assumptions in the plan, proven or disproven before UI is built on top of them. Vision Camera frame processors need `react-native-worklets-core` and a babel plugin, and compatibility with RN 0.86 / React 19 / New Architecture is **unverified** — candidates exist ([`react-native-mediapipe-posedetection`](https://github.com/EndLess728/react-native-mediapipe-posedetection), New-Architecture-only, 33 landmarks + GPU; [`react-native-mediapipe`](https://cdiddy77.github.io/react-native-mediapipe/docs/api_pages/pose-landmark-detection/); or a custom Kotlin plugin) but none is confirmed against this SDK.

- [ ] Get per-frame pose landmarks out of a real camera feed in a dev-client build on a physical device
- [ ] **Per-frame inference cost** (ms/frame) — decides whether 120fps capture is viable inside the P50 ≤ 8s budget, or whether 60fps is the honest ceiling (§8)
- [ ] **Maximum sustainable capture fps** for a buffered window, with format actually granted (not requested)
- [ ] **Motion blur at the achievable shutter setting** — film fast limb movement in daylight, inspect blur, check whether keypoint confidence holds. Decides whether EV bias suffices or a custom Camera2 module is needed (§3)
- [ ] **Whether actual exposure duration is readable** at all — determines what `shutter_speed_sec` can honestly contain (§7)
- [ ] **Whether the `conf < 0.70` firewall catches an occluded far-side limb** (§7)
- [ ] If no plugin works on SDK 57: record it in the Dead End Registry and evaluate fallbacks (custom Expo module, or pinning to an older SDK) before proceeding

### Milestone 1 — Capture + guided setup
- [ ] Camera permission flow
- [ ] Landscape lock, safe-area handling (§10.3)
- [ ] Alignment/stencil overlay for the PRD capture constraints (2.8–3.2m distance, 1.1m tripod height, roll/pitch <3°), roll/pitch from `expo-sensors`. **This is the system's only enforcement of those constraints (§7)** — treat it as such, not as decoration
- [ ] **Tripod-side guidance from `bowling_arm`** — tell the coach which side to film from so the front leg is the near, unoccluded one (§7)
- [ ] Format selection for fps/resolution, showing **actually-granted** values, never requested ones
- [ ] **Session pool selection** — pick who's at the nets from the roster, resolve every member's `session_id` up front, hold locally, allow mid-session edits, survive an app restart; show `consent_blocked` players as unavailable with the reason (§6)
- [ ] **Quick-select strip on the capture screen** — pool members only, one local-state tap, no network call, selected name rendered large (§6: mis-selection is silent and undetectable downstream)

### Milestone 2 — Extraction → contract
- [ ] Buffered capture-then-extract pipeline, buffer discarded immediately after extraction and never written anywhere persistent (§8)
- [ ] Landmarks mapped to `KeypointFrame` — pixel-space conversion, front-leg selection, `shoulder` + `wrist` included, documented `conf` source (§7)
- [ ] All six `capture_metadata` fields populated honestly, with unknowns marked as unknown rather than invented (§7)
- [ ] Unit test: synthetic known geometry → expected angle, cross-checked against the backend's `angles.py` expectations

### Milestone 3 — Ingestion + verdict
- [ ] `POST /api/v1/sessions/delivery` with the Supabase JWT attached
- [ ] Verdict card rendering all four statuses, with the "why was this flagged?" disclosure
- [ ] Nudge FFS ±1 (`POST /api/v1/deliveries/{id}/nudge-ffs`). **Not** `/action` — approve/dismiss is dashboard-only (§6)
- [ ] Error mapping: 403 `ERR_CONSENT_REQUIRED`, 422 `ERR_UNKNOWN_BASELINE` (the default state of every new bowler — see §10.4), 422 `ERR_THERMAL_THROTTLE`, 401 (re-auth), 404 (unknown session)

### Milestone 4 — Field resilience
- [ ] **Offline queue.** Nets have poor connectivity; keypoint payloads are small JSON (tens of KB), so queue-and-retry is cheap and high-value. A delivery captured out of signal must not be lost
- [ ] Thermal degradation — continuous camera plus on-device inference heats phones fast, and the backend already has a `ThermalThrottleError`. At minimum, watch for achieved-fps collapse and warn before data quality silently drops
- [ ] Battery: the capture screen holds the camera open; make that cost visible and interruptible rather than surprising

### Milestone 5 — Demo readiness
- [ ] End-to-end on a real device against the deployed API, walked through the same 5-delivery narrative as `scripts/demo_walkthrough.py`
- [ ] Sunlight legibility check on real hardware outdoors (§4)
- [ ] Device checklist: which phone, which Android version, dev-client APK installed, tripod, tape measure

## 10. Dependencies and open decisions

### 10.1 Backend — done (`BACKEND_PLAN.md` Milestone 9)
- [x] **`GET /api/v1/athletes`** — name-ordered roster for pool selection, returning `bowling_arm` and `consent_blocked`. Omits `dob` by design: read on a shared net-side phone
- [x] **`POST /api/v1/athletes`** — registration for the dashboard, `bowling_arm` required
- [x] **`bowling_arm` on `athletes`** — migration applied, nullable only for legacy rows
- [x] Mid-session join needed nothing new — `POST /athletes/{id}/sessions` is get-or-create
- Caveat: the roster is **not** scoped per coach (no ownership column on `athletes`), so every coach sees every athlete. Fine for one club; flagged in `BACKEND_PLAN.md` Milestone 9

**Two small backend changes this review recommends** (neither blocking):
- `shutter_speed_sec` → `float | None`, so "unknown" is expressible instead of fabricated (§7)
- Session date is derived server-side from `date.today()` in the server's timezone (UTC on Render). A coach training between 00:00 and 05:30 IST would get a session dated to the previous UTC day, quietly splitting one nets session in two. Unusual hours, small fix, worth knowing before someone debugs it at a tournament

### 10.2 Dashboard — the sharp edge
Players are created in the dashboard with `bowling_arm`, `dob` and `guardian_consent`. **The dashboard does not exist.** `apps/web/src/routes/DashboardPlaceholder.tsx` renders "Not built yet" and talks to no API; `FRONTEND_PLAN.md`'s Milestone 7 ("Dashboard starts as its own app") is unstarted. So today there is no way to create a player this app can use, and `dob`/`guardian_consent` matter directly — the consent gate 403s unconsented minors and this app has no screen to resolve that.

For the demo, one of: extend `scripts/seed.py` to create the pool (cheapest), build a minimal player-creation form in the dashboard (correct, but another workstream's milestone), or a temporary creation path in the app (contradicts §2 — only if the first two are impossible).

### 10.3 Orientation — resolved: landscape, locked, app-wide
Capture must be landscape: the analysis is a side-on sagittal view, the stride is lateral movement across the frame, and high-fps formats are natively 16:9. The deciding argument isn't aesthetic though — **the phone is physically clamped to a tripod.** Nobody unmounts and re-clamps it to read a verdict. Per-screen orientation would be a rotation the hardware can't perform, so one lock for the whole app, and every screen designed for a wide, short viewport.

### 10.4 First-run baseline — a genuine chicken-and-egg, unresolved
This is the most serious finding of this review, and it is a **product-blocking gap in the backend, not a mobile UI question**.

- `pipeline._score` raises `UnknownBaselineError` when an athlete has no confirmed baseline, and it raises *before* `save_delivery` — by design, so no orphaned delivery rows are left behind.
- A baseline is meant to be computed from **8–10 benchmark deliveries** (PRD §4 Layer 2; `POST /athletes/{id}/baseline`'s own docstring says computing the numbers from a batch of deliveries is a coach/UI workflow step, not something the endpoint does).
- **So: you need deliveries to produce a baseline, and a baseline to ingest deliveries.** There is currently no API path that stores a good-quality delivery for a baseline-less athlete. The only thing that *does* persist without a baseline is a `DATA_SUPPRESSED` one, because the quality firewall short-circuits before the baseline lookup — meaning the system keeps unusable deliveries and discards usable ones for a new bowler.

Every newly created player starts in this state, so this is the first thing a real coach would hit. Options:
- **(a)** A benchmark-collection path: ingest, measure and persist kinematics without scoring, for athletes with no baseline. Needs a way to express "measured, not compared" — a new status, or a nullable verdict.
- **(b)** `POST /athletes/{id}/baseline` already accepts `median_deg`/`iqr_deg` directly, so a coach *can* type numbers in — but there's no supported way to obtain them, so this legitimises a guess.
- **(c)** Demo-only: pre-seed baselines (what `scripts/seed.py` does today). Unblocks a demo; doesn't solve onboarding.

**For the demo, (c).** For the product, (a) is the real answer and should be its own backend milestone. Until then the app needs an honest screen for a state it cannot fix — hence the benchmark-collection state, §5 screen 7 — rather than surfacing a raw 422.

## Dead End Registry

*(empty — add an entry whenever an approach is tried and dropped: what was tried, why it failed, what replaced it.)*

## Notes on resolved conflicts

- **Web-only vs. native** (decided 2026-09-12): `FRONTEND_PLAN.md` frames CoachLens as web-only with nothing to install. Reversed for **capture specifically**. The load-bearing reason is on-device extraction and PRD §10's ephemeral-video invariant, plus native-only high frame rates — *not* shutter control, which the chosen library doesn't expose either (§1). The marketing site stays a web app; only delivery capture moves native.
- **Design system scope**: `DESIGN.md` is the web site's language. §4 is the authority for what applies on mobile, including the deliberate contrast-ramp deviation for outdoor use.
- **Real-time vs. buffered extraction**: frame-processor inference at capture rate was the assumed approach and is rejected — BlazePose can't sustain 120fps, and dropped frames near front-foot contact are the costliest ones to lose. Buffered capture-then-extract instead (§8).
