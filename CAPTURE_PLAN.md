# CoachLens — Delivery Capture: Implementation Plan

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked/skipped (explain in Dead End Registry if abandoned)

Companion docs: [`DESIGN.md`](DESIGN.md) (visual language), [`BACKEND_PLAN.md`](BACKEND_PLAN.md) (the API this consumes), [`FRONTEND_PLAN.md`](FRONTEND_PLAN.md) (the marketing site and dashboard this now shares a codebase with).

## 0. History — why this file exists instead of a native app

**2026-09-12, morning:** decided native (`MOBILE_PLAN.md`, now deleted — see git history). Reasoning: on-device pose extraction was believed to require a compiled native app, since a browser upload flow would have to ship video to a server and extract there, reintroducing the cloud-GPU cost and youth-video-exposure risk `BACKEND_PLAN.md` Milestone 7 had explicitly declined.

**2026-09-12–13, that same day:** built `apps/mobile` (Expo + `react-native-vision-camera` + `react-native-mediapipe`), fought through a real sequence of native-stack problems (a `babel-preset-expo` hoisting bug, a `react-native-vision-camera` v5 architecture trap, a confirmed upstream preview-rotation bug when a frame processor is attached, an `RGBA_8888` pixel-format mismatch), and got it working: **33 real BlazePose landmarks, confirmed on physical hardware, 59.0ms/frame CPU inference.** The native path was proven technically viable, not abandoned because it failed.

**2026-09-13, reversed:** by explicit decision, native was dropped anyway and capture folded into `apps/web`. What changed the calculus wasn't a technical failure of the mobile app — it was recognizing that **the "on-device extraction requires native" premise was wrong**. MediaPipe ships an official Web build (`@mediapipe/tasks-vision`, WebAssembly) that runs the *same* pose-landmarker models directly in a browser tab. "On-device" means "on the phone," not "in a compiled app" — a browser tab on the phone is still on-device. That means:

- The Ephemeral Video Pipeline invariant (PRD §10) still holds: video never leaves the browser tab, only keypoints get POSTed to the backend.
- `DeliveryIngestionRequest`'s contract is **unchanged** — same `raw_keypoints`/`capture_metadata` shape the backend already expects, whichever device produced it.
- Every real cost the native path was paying — 13–15 minute EAS rebuild cycles for any native-dependency change, Expo/RN/vision-camera/worklets-core version-compatibility fights, a custom config plugin just to bundle a model file into an Android assets folder — goes away. Web iterates on save.
- The one thing genuinely lost: manual shutter/exposure control and guaranteed 60/120fps capture, which native *would* have given access to via Camera2/AVFoundation (though `react-native-vision-camera` itself never actually exposed manual shutter either — see the deleted plan's own finding). This is accepted as a real tradeoff, not an oversight — see §3.

`apps/mobile` has been deleted (`git rm -r`). Its Milestone 0.5 findings are preserved above and in git history (commits through `2026-09-13`) since they're real, verified facts about MediaPipe/BlazePose itself, not native-specific — the inference-cost number in particular still matters for §5 below.

## 1. Scope boundary

This is a **capture feature inside `apps/web`**, not a separate app. It shares the codebase, the design system (`DESIGN.md`), and the deployment with the marketing site and the coach dashboard already built there (`apps/web/src/routes/dashboard/`).

- Guided camera setup (`getUserMedia`), record, on-device (in-browser, WASM) pose extraction, POST keypoints to the existing `/api/v1/sessions/delivery` contract, show the verdict.
- Backend contract does not change. `services/coaching-api` gets a new consumer; nothing in its schemas or pipeline needs to change for this.
- Coordinate with whoever owns `apps/web`/`FRONTEND_PLAN.md` before landing this — it's a different workstream's codebase, being extended here at explicit request rather than owned by the backend session.

## 2. What carries over from the deleted mobile plan, unchanged

These are facts about the *problem*, not about React Native — they don't stop being true because the client is a browser tab instead of a compiled app:

- **Front-leg selection via `bowling_arm`.** Still resolved the same way: `bowling_arm` on the athlete record deterministically picks which leg is the front (landing) leg, and MediaPipe's left/right landmark labels are anatomical, so filming side doesn't need to be known separately.
- **The aspect-ratio pixel-space conversion.** MediaPipe's landmarks are normalized `[0,1]` per axis; the backend computes angles as vectors between points, so `x`/`y` must be converted to a uniform pixel space (multiply by actual frame width/height) before sending — silently wrong on a non-square frame otherwise. Applies identically in a browser canvas as it did in the native `Frame` object.
- **`shoulder`/`wrist` must be sent explicitly.** Optional in the schema, but the second PRD metric (trunk tilt) and release-frame detection depend on them — MediaPipe provides both regardless of platform.
- **Confidence semantics.** MediaPipe Web's `Landmark` also carries `visibility`/`presence` — same open question (§6.4 of the deleted plan: likely `visibility`, matching the backend's `conf < 0.70` firewall intent), same need to pick deliberately and document it.
- **`capture_metadata` is unenforced provenance, backend-side, on any platform.** No backend decision logic reads any of its six fields (confirmed by reading `measurement/audit.py`) — the capture client's own guided-setup UI is the only enforcement of the PRD's distance/height/roll constraints, browser or native.
- **The baseline chicken-and-egg is already fixed, backend-side, independent of platform** (`BACKEND_PLAN.md` Milestone 10, `BENCHMARK_PENDING`) — nothing here depends on it, but nothing here needs to re-solve it either.

## 3. What's different in a browser, and the real cost being accepted

- **No manual shutter/exposure control.** Confirmed dead end either way — `react-native-vision-camera` never exposed it on native (EV bias only), and browser `MediaTrackConstraints` don't either. This was never actually a native-vs-web distinction; recorded here so it isn't relitigated.
- **fps is best-effort, not guaranteed.** `getUserMedia`'s `frameRate` constraint is a request the browser/OS may not honor exactly — read back `track.getSettings()` for the achieved value, same "show what's actually granted, never what was requested" discipline the native plan had (§7 there).
- **No native module compatibility risk, but a different one: browser API support varies by device/OS.** iOS Safari in particular has historically lagged on `getUserMedia` constraint support and WASM performance. Needs real testing on actual target hardware (low-end Android Chrome, iOS Safari) before assuming parity with what the native spike measured on the Samsung A01/A015.
- **WASM inference is not guaranteed to match native inference speed.** The 59.0ms/frame figure from the deleted plan's spike was native Kotlin/CPU-delegate MediaPipe. `@mediapipe/tasks-vision`'s WASM build has real, separate overhead characteristics (WASM SIMD support, thread availability via `SharedArrayBuffer`/COOP-COEP headers) that must be measured fresh, not assumed equal. **First thing to verify, mirroring the native plan's own Milestone 0.5 discipline: get a real number on real target hardware before building UI on top of an assumption.**

## 4. Milestones

### Milestone 0 — Scaffold
- [x] `@mediapipe/tasks-vision` (`1.0.1`) installed in `apps/web`
- [x] Model file bundled: `apps/web/public/models/pose_landmarker_lite.task` (re-downloaded from Google's storage after the native app's copy was deleted along with it; verified as a valid file — correct size, valid zip signature — not a repeat of the earlier corrupted-download mistake). WASM runtime itself loads from jsdelivr's CDN pinned to the exact installed version (the package's own documented approach — see `README.md` in `node_modules/@mediapipe/tasks-vision`), not bundled: 34MB across SIMD/no-SIMD/module variants, versioned and cacheable, unlike the 5.7MB single-purpose model.
- [x] Minimal capture page built and verified rendering with no console errors (`src/routes/dashboard/CapturePage.tsx`, `/app/capture`) — camera permission itself untestable from this environment's browser tooling (blocks device capture by design), confirmed via real page load, an actual `getUserMedia` permission-denied error surfacing cleanly in the diagnostic overlay (not a crash), and correct routing/auth-gate behavior
- [x] `NormalizedLandmark` on web has **only** `visibility`, no separate `presence` field — resolves the confidence-semantics question the deleted native plan left open. One number, no ambiguity.

### Milestone 0.5 — WASM inference spike (do this before building more UI, matching the native plan's own discipline) — **blocked on physical device access**
- [ ] Get real pose landmarks out of a live `getUserMedia` stream on actual target hardware — a low-end Android phone's Chrome browser at minimum, matching the native spike's own "budget device" testing philosophy. **Attempted 2026-09-13: the same physical Samsung A01/A015 used for the native spike disconnected from USB mid-session** (adb reports "no devices found") — needed again specifically because `getUserMedia` requires a secure context, and Chrome only treats plain HTTP as secure for `localhost`, not a LAN IP, so `adb reverse` (making the dev server reachable as `localhost` on the phone) is the only zero-setup path without standing up HTTPS. Re-run once reconnected.
- [ ] **Measure real per-frame inference cost in this browser/WASM context.** Do not assume the native 59.0ms/frame figure carries over — get a fresh number. The diagnostic overlay already built into `CapturePage`/`usePoseLandmarker` reports this live (`performance.now()` around each `detectForVideo` call) — no separate throwaway page needed once a device is available
- [ ] Check whether `SharedArrayBuffer`/multi-threaded WASM is available (needs COOP/COEP response headers from whatever serves `apps/web` — confirm the deployment target sets these, since single-threaded WASM fallback could be substantially slower)
- [ ] Re-run the same budget math the native plan did once a real number exists: at measured `Xms/frame`, is a 1.5s capture window's worth of frames processable inside the PRD's P50 ≤ 8s SLA at 30/60/120fps?
- [ ] Try `delegate: 'GPU'` vs `'CPU'` — code currently requests `'GPU'` by default (untested); the native spike only ever measured CPU

### Milestone 1 — Capture UI
- [ ] Guided alignment overlay for the PRD's capture constraints (2.8–3.2m distance, 1.1m tripod height, roll/pitch <3°) — a phone's browser has no direct roll/pitch sensor API as clean as native `expo-sensors` was; check `DeviceOrientationEvent` (iOS Safari requires an explicit permission prompt for this, `DeviceOrientationEvent.requestPermission()`). **Not yet built** — the current capture screen has no alignment guidance at all, just the raw preview
- [ ] Tripod-side guidance from `bowling_arm` — **not yet built**
- [x] **Session-pool / quick-select flow built** (`useSessionPool.ts`, `CapturePage.tsx`'s `SessionPoolSetup`/`CaptureScreen`). Matches the deleted plan's §6 reasoning exactly: a small pool picked once per nets session (checkbox list off the real `GET /api/v1/athletes`-shaped roster, `consent_blocked` athletes shown disabled with the reason rather than failing later), every member's `session_id` resolved up front via `POST /api/v1/athletes/{id}/sessions` at pool-confirmation time (not lazily on first tap), held in `localStorage` (not `sessionStorage` — a nets session can span hours and tab lifetimes, unlike the coach's own sign-in) and scoped to the calendar day so a stale pool from a prior day doesn't silently reuse yesterday's session ids. Mid-session join implemented as an "+ Add" picker that calls the same `startSession` path for one athlete without disturbing the rest of the pool. Runs against the dashboard's existing mock API layer (`lib/api/client.ts` / `lib/api/mock/handlers.ts`), consistent with the rest of the dashboard, which isn't wired to the real backend yet either — added `startSession`/`SessionStartResult` there, mirroring the real `POST /api/v1/athletes/{id}/sessions` response shape exactly.

### Milestone 2 — Extraction → contract
- [ ] Pixel-space conversion, front-leg selection, `shoulder`+`wrist` inclusion (§2 above)
- [ ] Raw video frames never persisted or uploaded — discarded after extraction, same as the native plan's invariant
- [ ] Unit test: synthetic known geometry → expected angle, cross-checked against the backend's own `angles.py`

### Milestone 3 — Ingestion + verdict
- [ ] `POST /api/v1/sessions/delivery` with the coach's Supabase JWT
- [ ] Verdict rendering for all five statuses including `BENCHMARK_PENDING`
- [ ] Nudge FFS control

## Dead End Registry

**Native mobile app (Expo/React Native), 2026-09-12–13.** Not a failure — MediaPipe pose extraction was proven working on real hardware (33 landmarks, 59.0ms/frame CPU inference) after resolving a `babel-preset-expo` hoisting bug, correctly pinning `react-native-vision-camera` to v4 over v5's incompatible Nitro-Modules rearchitecture, a confirmed upstream preview-rotation bug when a frame processor is attached to a live rotatable preview, and an `RGBA_8888` pixel-format mismatch between VisionCamera's default and MediaPipe's native packet creator. Reversed anyway once it was recognized that "on-device extraction" doesn't require a compiled native app — MediaPipe's WASM Web build runs the same models in a browser tab, which is still on-device, without any of the native toolchain's rebuild-cycle or dependency-compatibility costs. See §0 above for the full account.

## Notes on resolved conflicts

- **Native vs. web, round two** (2026-09-13): reverses the 2026-09-12 native decision. The load-bearing premise behind going native — that on-device extraction requires a compiled app — was wrong; MediaPipe's WASM build makes "on-device" achievable from a browser tab. What's genuinely lost (manual shutter, guaranteed high fps) was never actually available via `react-native-vision-camera` on native either, so it isn't a new loss from this reversal specifically.
