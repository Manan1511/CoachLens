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
7. **Benchmark-collection state** — what a bowler with no confirmed baseline sees. **Backend fixed 2026-09-12** (`BACKEND_PLAN.md` Milestone 10): these deliveries are now measured and persisted (`BENCHMARK_PENDING`), not rejected. What remains open is presenting that state honestly on-screen rather than as a raw status string (§10.4).

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

Five of six fields are required by the schema: `fps`, `pacing_jitter_pct`, `distance_meters`, `tripod_height_meters`, `camera_roll_deg`. `shutter_speed_sec` is now `float | None` (fixed 2026-09-12, `BACKEND_PLAN.md` Milestone 10) — send the real exposure duration if the platform surfaces it, `null` otherwise, never a fabricated number.

**None of them is read by any backend decision logic.** They're persisted into the `capture_metadata` jsonb and never consulted — `measurement/audit.py` explicitly measures pacing from frame timestamps "rather than trusting a self-reported" value. So the PRD's capture constraints (2.8–3.2m, 1.1m tripod height, roll <3°, shutter ≤1/1000s) are **recorded provenance, not enforced constraints**, anywhere in the system.

That reframes the guided-setup overlay from a nicety into the *only* place those constraints are enforced at all. If the app doesn't hold the line on them, nothing does — and every downstream number silently inherits whatever geometry the coach happened to set up.

One consequence worth being honest about: `distance_meters` and `tripod_height_meters` are not measurable by the phone. They're coach-entered or eyeballed against the stencil, and should be presented as *claims* rather than measurements.

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
- [x] `expo-dev-client` installed
- [x] `eas.json` (development/preview/production profiles, dev-client APK for internal distribution) and `app.json` configured (orientation currently `sensorLandscape`, black canvas per §4, bundle/package identifiers, EAS project linked as `@manan1511/coachlens-mobile`)
- [x] `react-native-vision-camera` installed — **pinned to `4.7.3`, not latest.** `expo install` resolves to the newest major by default, which is now v5 ("VisionCamera Core"), rearchitected around Nitro Modules (`react-native-nitro-modules`/`react-native-nitro-image`) with no classic frame-processor plugin API. The community MediaPipe plugins this plan counts on (§0.5) target v4's frame-processor architecture, so v5 would have silently made every one of them incompatible. Recorded in the Dead End Registry.
- [x] **Two separate worklet runtimes now required, not one**: `react-native-worklets-core` (VisionCamera's frame processors) and `react-native-worklets` (Reanimated 4's own engine — `react-native-reanimated/plugin` is now just a re-export of `react-native-worklets/plugin`, confirmed by reading its source). `babel.config.js` runs both; whether they coexist cleanly in one Babel pass across the same `'worklet'` directive is **unverified** — first thing the spike must confirm
- [x] `enableFrameProcessors: true` set explicitly in the vision-camera Expo config plugin options — **not on by default.** Without it, the plugin never sets the `VisionCamera_enableFrameProcessors` Gradle property, and the native Android build silently excludes frame-processor support entirely. Would have looked like a working install until the first frame processor mysteriously failed
- [x] EAS Android builds install and run on a physical device (Samsung A01/A015) via `adb install` over USB — three builds shipped and tested this way so far

### Milestone 0.5 — Capture spike (**do this before anything else**)
The riskiest assumptions in the plan, proven or disproven before UI is built on top of them. Compatibility with RN 0.86 / React 19 / New Architecture is **unverified** for both the frame-processor pipeline itself and any pose plugin on top of it. Candidate MediaPipe plugins exist ([`react-native-mediapipe-posedetection`](https://github.com/EndLess728/react-native-mediapipe-posedetection), New-Architecture-only, 33 landmarks + GPU; [`react-native-mediapipe`](https://cdiddy77.github.io/react-native-mediapipe/docs/api_pages/pose-landmark-detection/); or a custom Kotlin plugin) but none is confirmed against this SDK — deliberately not attempted yet.

- [x] **Diagnostic screen written and iterated** (`src/screens/CaptureSpikeScreen.tsx`) — see the real sequence of findings below, which changed its design mid-milestone.
- [x] **Confirmed running on a physical device** (Samsung A01/A015, over USB via `adb reverse tcp:8081` — no shared Wi-Fi needed). Camera preview renders, permission flow works.
- [x] **The two worklet runtimes do coexist** — `react-native-worklets-core` (frame processor) and `react-native-worklets` (Reanimated 4) both compiled and ran correctly in one Babel pass, confirmed while the screen still had a live frame processor attached (see below). The real risk this milestone existed to catch did not materialize.
- [x] **Real regression found and fixed on-device**: a plain module-scope array mutated inside the frame processor did **not** persist across invocations — logcat showed its length stuck at exactly 1 on every call despite frames genuinely arriving ~33ms apart (confirmed from raw `frame.timestamp` deltas in device logs). Fixed by switching to `useSharedValue` (worklets-core's actual supported mechanism for state that must survive across worklet invocations). **Rule for everything built on this from here on: never use a bare module-level variable for state mutated inside a frame processor. Use `useSharedValue`.**
- [x] **Maximum sustainable capture fps measured on real hardware** (before the pivot below removed live measurement): `3840x2160 @ 30fps` on the Samsung A01/A015, requesting `[{fps: 120}, {videoResolution: 'max'}]`. **Notably not 60/120fps.** This is a budget device and may simply lack faster modes at any resolution — needs checking on higher-end hardware before treating 30fps as a general ceiling rather than this specific phone's limit.
- [x] **Confirmed upstream bug, real device: live preview does not rotate correctly while a `frameProcessor` is attached.** Held in landscape, the preview showed a stretched/rotated image; matches [mrousavy/react-native-vision-camera #3526](https://github.com/mrousavy/react-native-vision-camera/issues/3526), #3259, #210 exactly. Three fix attempts on-device all failed: (1) switching `app.json` orientation from a single `landscape` to `sensorLandscape` — no effect, because the preview wasn't listening to the orientation lock at all while the processor was attached, so the manifest value was never the actual lever; (2) a manual CSS dimension-swap-plus-`rotate(90deg)` transform on the `<Camera>` view — produced a stretched image, since it fought the library's own internal preview scaling instead of cooperating with it; (3) forcing a full native-view remount keyed to `useWindowDimensions()` — no effect either.
- [x] **Pivoted to match the architecture that was always the plan, not a workaround**: removed the live `frameProcessor` from this screen entirely. §8 already decided real capture is buffered-then-extract, not live frame-by-frame processing — MediaPipe can't sustain 120fps inference regardless, so nothing in the real app needs a processor attached *during* live preview. The spike screen was only combining the two for diagnostic convenience. **Confirmed working correctly oriented and unstretched on-device** with the processor removed. Frame-processor plumbing itself stays proven by the earlier findings above — only the live-preview-plus-processor combination was ever the problem, and Milestone 2's buffered pipeline (record window → stop → extract against buffered frames, preview not simultaneously active) avoids that combination by construction.
- [ ] **Live achieved-fps display needs a different mechanism now**, since it depended on the removed frame processor. Options for Milestone 1/2: read fps from a brief processor attached only during an explicit buffered-capture window (matches the real architecture anyway), or from `Camera`'s recording-session metadata after a test clip.
- [ ] **Per-frame inference cost** (ms/frame) once MediaPipe is added — decides whether 120fps capture is viable inside the P50 ≤ 8s budget on hardware that supports it, or whether 60fps (or even this device's 30fps) is the honest ceiling (§8)
- [ ] **Motion blur at the achievable shutter setting** — film fast limb movement in daylight, inspect blur, check whether keypoint confidence holds. Decides whether EV bias suffices or a custom Camera2 module is needed (§3)
- [ ] **Whether actual exposure duration is readable** at all — determines what `shutter_speed_sec` can honestly contain (§7)
- [ ] **Whether the `conf < 0.70` firewall catches an occluded far-side limb** (§7)
- [x] **Orientation resolved, for real this time**: the earlier "sideways when held portrait" reports weren't purely the expected lock behavior — they were compounded by the frame-processor preview bug above, which made the image wrong even when held correctly. With the processor removed, the preview is confirmed correctly oriented on-device. `app.json` is currently `sensorLandscape` (allows both landscape rotations); since the real product only needs one fixed tripod orientation (§10.3), narrowing back to a single direction is optional future cleanup, not a correctness requirement.
- [ ] Attempt a MediaPipe pose plugin now that the frame-processor baseline is proven (via buffered attachment, not live-preview attachment — see above). If none works on SDK 57: record it in the Dead End Registry and evaluate fallbacks (custom native module, or pinning to an older SDK) before proceeding

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
- [ ] **`BENCHMARK_PENDING` verdict card** — the state every new bowler starts in (§10.4), no longer an error to map. Needs its own honest presentation ("still collecting data for a baseline"), not a generic verdict card with empty baseline fields
- [ ] Error mapping: 403 `ERR_CONSENT_REQUIRED`, 422 `ERR_THERMAL_THROTTLE`, 401 (re-auth), 404 (unknown session)

### Milestone 4 — Field resilience
- [ ] **Offline queue.** Nets have poor connectivity; keypoint payloads are small JSON (tens of KB), so queue-and-retry is cheap and high-value. A delivery captured out of signal must not be lost
- [ ] Thermal degradation — continuous camera plus on-device inference heats phones fast, and the backend already has a `ThermalThrottleError`. At minimum, watch for achieved-fps collapse and warn before data quality silently drops
- [ ] Battery: the capture screen holds the camera open; make that cost visible and interruptible rather than surprising

### Milestone 5 — Demo readiness
- [ ] End-to-end on a real device against the deployed API, walked through the same 5-delivery narrative as `scripts/demo_walkthrough.py`
- [ ] Sunlight legibility check on real hardware outdoors (§4)
- [ ] Device checklist: which phone, which Android version, dev-client APK installed, tripod, tape measure

## 10. Dependencies and open decisions

### 10.1 Backend — done (`BACKEND_PLAN.md` Milestones 9–10)
- [x] **`GET /api/v1/athletes`** — name-ordered roster for pool selection, returning `bowling_arm` and `consent_blocked`. Omits `dob` by design: read on a shared net-side phone
- [x] **`POST /api/v1/athletes`** — registration for the dashboard, `bowling_arm` required
- [x] **`bowling_arm` on `athletes`** — migration applied, nullable only for legacy rows
- [x] Mid-session join needed nothing new — `POST /athletes/{id}/sessions` is get-or-create
- [x] **Baseline chicken-and-egg fixed** — `BENCHMARK_PENDING` status added, `_score` measures and persists instead of raising. See §10.4
- [x] **`shutter_speed_sec` → `float | None`** — "unknown" is now expressible instead of fabricated
- [x] **Session date now uses `Asia/Kolkata`**, not the server's UTC — a coach training in the small hours of IST no longer risks one nets outing splitting across two session rows
- Caveat: the roster is **not** scoped per coach (no ownership column on `athletes`), so every coach sees every athlete. Fine for one club; flagged in `BACKEND_PLAN.md` Milestone 9

### 10.2 Dashboard — reviewed 2026-09-12, a real dashboard now exists, still not wired up

**Updated after reviewing the actual dashboard code** (`apps/web/src/routes/dashboard/`, merged into `dev` in the interim — note it's under active development elsewhere as this is written, so re-check before relying on specifics below). The earlier "dashboard does not exist" placeholder is gone: `FRONTEND_PLAN.md`'s Milestone 7 was reversed (`apps/web/src/routes/dashboard/`, routed at `/app/*`, not a separate app as originally planned) and a real Roster / Athlete-detail / Baseline / Session-timeline UI is built, with `lib/api/types.ts` hand-typed against this session's actual backend schemas (`bowling_arm`, `consent_blocked`, `BENCHMARK_PENDING` — its own header comment cites the exact migration files) and `AthleteDetailPage.tsx` keeping a formula (the outlier-threshold band) in sync with the real Python by hand, with a comment saying so. This is careful, cross-referenced work, not a guess at the contract.

**Three things this app still can't rely on yet:**

1. **The dashboard runs entirely on in-memory mock data**, not the real API. `lib/api/client.ts` is explicit about this: `listAthletes`/`getAthlete`/`exportWhatsapp` already mirror the real endpoints in shape, but every call still goes to `./mock/handlers.ts`, "only because it's a moving target owned by someone else on the team right now, not because the endpoints don't exist." So even once the dashboard's UI supports something, it isn't yet creating rows in the real Supabase `athletes` table this app's roster (`GET /api/v1/athletes`) would see.
2. **No player-creation UI exists anywhere in the dashboard.** `RosterPage.tsx` is read-only — it lists and sorts athletes by urgency, nothing more. There is no "add player" button, form, or API call in the codebase (checked directly, not inferred). §9's dependency on a way to create players with `bowling_arm`/`dob`/`guardian_consent` is **still open** — this hasn't regressed, but it also hasn't been resolved by the dashboard landing.
3. **Baseline confirmation exists, but as manual entry, not as the benchmark-pull pipeline `BACKEND_PLAN.md` Milestone 10 was building toward.** `BaselinePanel.tsx` lets a coach paste in 8–10 angle readings by hand (comma/newline separated), computes median+IQR client-side, and calls `confirmBaseline` directly — this is exactly option (b) from §10.4's original list ("legitimises a guess," since there's no enforced link to real `BENCHMARK_PENDING` deliveries). It does functionally unblock a coach getting *some* baseline confirmed without typing numbers into Swagger, but it doesn't consume the `BENCHMARK_PENDING` data the backend now persists specifically so a real pipeline could be built on it. Worth a conversation with whoever owns the dashboard about whether that's the deliberate final design or a placeholder.

**One thing worth flagging back upstream, not fixed here:** `FRONTEND_PLAN.md`'s own Dead End Registry still contains *"Mobile-app framing (abandoned). CoachLens is a web app; capture is just the phone's own camera"* — unchanged since before this entire native app was built and shipped to a physical device. This directly contradicts everything in this file. Not edited here since that file is someone else's actively-worked-on document (matches the repo's own "don't reformat the other side's files" convention) — flag it to whoever owns the frontend side.

For this app's demo path specifically, the options from before still stand: extend `scripts/seed.py` to create the pool (cheapest, and what's actually been used so far), wait for the dashboard's player-creation form once built, or a temporary creation path in the app (contradicts §2 — last resort only).

### 10.3 Orientation — resolved: landscape, locked, app-wide

Capture must be landscape: the analysis is a side-on sagittal view, the stride is lateral movement across the frame, and high-fps formats are natively 16:9. The deciding argument isn't aesthetic though — **the phone is physically clamped to a tripod.** Nobody unmounts and re-clamps it to read a verdict. Per-screen orientation would be a rotation the hardware can't perform, so one lock for the whole app, and every screen designed for a wide, short viewport.

**Portrait was briefly considered and rejected same-day (2026-09-12)**, before any build ever shipped it — noted here so it isn't re-proposed without new information. The rejection reason, for the record: a phone recording in portrait mode captures a narrower horizontal field of view than the same phone in landscape (portrait video is taller and narrower, not landscape video merely rotated). For a side-on sagittal view where the whole point is keeping a laterally-moving bowler in frame through the delivery stride, that narrower FOV works against the PRD's 2.8–3.2m capture-distance band. Landscape stands.

### 10.4 First-run baseline — backend fixed 2026-09-12, app work remains

The chicken-and-egg is gone: `pipeline._score` used to raise `UnknownBaselineError` before `save_delivery` for any athlete with no confirmed baseline, but a baseline is itself computed from 8–10 benchmark deliveries (PRD §4 Layer 2) — so no athlete could ever earn their first baseline through the API. Fixed in `BACKEND_PLAN.md` Milestone 10: a delivery from a baseline-less athlete is now measured and persisted as `DeliveryStatus.BENCHMARK_PENDING` — real kinematics, real confidence, real event frame, just no score against a baseline that doesn't exist yet. Verified end-to-end against the live database and the live Postgres enum.

**What this app still needs to do, now that the data exists to do it:**
- Render `BENCHMARK_PENDING` as its own honest state (§5 screen 7, §9 Milestone 3) — "measured, still collecting a baseline" is not an error and should not look like one
- Demo path unaffected: `scripts/seed.py` still pre-seeds a confirmed baseline directly, which remains the fastest way to get a *scored* demo narrative rather than a `BENCHMARK_PENDING` one

**Dashboard reviewed 2026-09-12 (§10.2)**: a baseline-confirmation UI does now exist (`BaselinePanel.tsx`), but it's manual entry — a coach pastes in readings by hand — not an aggregation of real `BENCHMARK_PENDING` deliveries. The "nothing aggregates BENCHMARK_PENDING into a baseline" gap is therefore still open in the sense that matters architecturally, even though a coach can now functionally get *a* baseline confirmed. See §10.2 for the full picture.

## Dead End Registry

**Live frame processor attached to the always-on preview (2026-09-12).** Tried combining a live `useFrameProcessor` with the rotatable live camera preview in `CaptureSpikeScreen`, to measure achieved fps/resolution in real time. Hit a confirmed upstream bug (mrousavy/react-native-vision-camera #3526, #3259, #210): the preview does not rotate correctly with the locked screen orientation while a processor is attached. Three on-device fix attempts failed: changing the `app.json` orientation lock (irrelevant — the preview wasn't listening to it while the processor was attached), a manual CSS dimension-swap-plus-rotate transform on the `<Camera>` view (produced a stretched image, fighting the library's own preview scaling), and forcing a native-view remount keyed to window dimensions (no effect). Replaced with: no live frame processor on the preview screen at all, matching §8's buffered-capture-then-extract architecture, which never needed one attached during live preview anyway. Confirmed correctly oriented and unstretched on real hardware once removed.

## Notes on resolved conflicts

- **Web-only vs. native** (decided 2026-09-12): `FRONTEND_PLAN.md` frames CoachLens as web-only with nothing to install. Reversed for **capture specifically**. The load-bearing reason is on-device extraction and PRD §10's ephemeral-video invariant, plus native-only high frame rates — *not* shutter control, which the chosen library doesn't expose either (§1). The marketing site stays a web app; only delivery capture moves native.
- **Design system scope**: `DESIGN.md` is the web site's language. §4 is the authority for what applies on mobile, including the deliberate contrast-ramp deviation for outdoor use.
- **Real-time vs. buffered extraction**: frame-processor inference at capture rate was the assumed approach and is rejected — BlazePose can't sustain 120fps, and dropped frames near front-foot contact are the costliest ones to lose. Buffered capture-then-extract instead (§8).
- **Baseline chicken-and-egg** (fixed 2026-09-12, `BACKEND_PLAN.md` Milestone 10): rejecting every delivery from a baseline-less athlete meant no athlete could ever produce the batch of benchmark deliveries a baseline is computed from. Fixed with a new `BENCHMARK_PENDING` status — measure and persist, don't reject. See §10.4.
