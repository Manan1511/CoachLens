# CoachLens — Frontend Implementation Plan

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked/skipped (explain in Dead End Registry if abandoned)

**Scope:** the public **marketing site** only. This is the shop window — it explains the product to grassroots coaches and collects interest. It is *not* the product. The coach-facing **dashboard is a separate web app** and should not be built in this codebase (see "Boundary with the dashboard").

**Product framing:** CoachLens is a **web app**, not a mobile app. Coaches film with the camera app already on their phone, then upload the clips in a browser. Nothing to install. Any copy implying an in-app stencil, an on-device capture app, or an App Store download is wrong.

**Design reference:** [ethnocare.ca](https://ethnocare.ca) — pure black canvas, white type, large statements set at regular weight, bold reserved for small labels, no accent colour, white cards as the only visual pop.

**Non-negotiable boundary:** CoachLens is a coaching tool, **not a medical device and not an injury predictor** (PRD §1). No copy anywhere on the site may imply diagnosis, injury risk, or medical advice. Pain always overrides anything the software says.

---

## Stack & commands

Vanilla HTML/CSS/JS built with Vite. No framework — the site is one scroll-driven page, and a framework would add weight without adding anything.

```
npm install
npm run dev      # vite dev server, port 3000, opens the browser
npm run build    # production build to dist/
npm run preview  # serve the built output
```

Dependencies are deliberately minimal: `vite` (build), `gsap` + its ScrollTrigger plugin (scroll animation, pinning, counters), `lenis` (smooth scroll). Inter is pulled from Google Fonts in `src/styles/index.css`.

---

## File map

```
index.html              Entire page: intro overlay, nav, 8 sections, footer
src/main.js             Entry point — Lenis smooth scroll, intro sequence, boot order
src/navigation.js       Sticky nav, mobile menu, anchor scrolling, active-link tracking
src/animations.js       GSAP: hero timeline, reveals, vision word-highlight,
                        pinned pillars, counters, floating CTA, footer wordmark
src/styles/index.css    Design tokens + base/reset + shared primitives (btn, badge, card)
src/styles/components.css  Section and component styles
public/favicon.svg      Black tile, white mark
public/logo-mark.svg    Mark alone, white (for dark surfaces)
public/logo-mark-detail.svg  Mark with vertex dot — print / large sizes only
public/images/          hero-bg.jpg, how-it-works.jpg, skeletal-overlay.jpg
```

Section `id`s double as nav anchors and as hooks for `animations.js`, so **renaming an id breaks both** the nav highlighting and an animation. The ids are: `hero`, `vision`, `architecture`, `how-it-works`, `science`, `metrics`, `specs`, `cta`, `footer`.

---

## Milestone 0 — Scaffold
- [x] Vite project, vanilla JS, GSAP + Lenis wired
- [x] Single-page structure with eight sections and a sticky nav
- [x] Responsive breakpoints at 900px (nav → mobile menu, hero → single column) and 640px (grids → single column)

## Milestone 1 — Content & information architecture
- [x] Narrative order: hero → why → approach → how it works → what we measure → accuracy → what you need → CTA → footer
- [x] Copy rewritten from PRD register into marketing register (see "Copy rules")
- [x] Product framed as a web app: film on a phone, upload in the browser
- [x] Non-diagnostic boundary stated in the footer and never contradicted in body copy

## Milestone 2 — Theme (ethnocare)
- [x] Pure black canvas, white type, no accent colour
- [x] Headings at weight 400 with -0.02em tracking; bold only for eyebrows, labels, logo
- [x] Two-tone monochrome emphasis (`.text-accent` dims rather than colours)
- [x] White CTA cards as the single visual pop
- [x] Imagery bleeds into the black — no frames, borders or drop shadows
- [x] Elevation expressed as hairline rings, since drop shadows are invisible on black

## Milestone 3 — Brand
- [x] Logo mark: a **C** closing around a measured angle — the lens and the measurement in one shape
- [x] Wordmark: "Coach" at 400, "Lens" at 600, set solid with -0.025em tracking
- [x] Favicon and mark files exported; nav and intro use inline SVG so the mark inherits `currentColor`
- [ ] Social/OG image (1200×630) — the `og:` tags exist but there is no image yet

## Milestone 4 — Intro sequence
- [x] "Introducing" → "CoachLens", with the **L drawn as an acute angle** that strokes itself on
- [x] Scroll locked while it plays; released on completion
- [x] `prefers-reduced-motion` honoured (skips straight to the page)
- [x] 6-second safety timeout so a stalled animation can never trap a visitor on a black screen
- [x] Hero animation deferred until the intro finishes, so it isn't played behind the overlay

## Milestone 5 — QA
- [x] Verified in a real browser at 1440px and 390px: no console errors, no horizontal overflow
- [~] Cross-browser check — only Chromium so far; **Safari and Firefox untested**
- [ ] Keyboard and screen-reader pass (focus states are currently browser defaults; the pinned section and intro overlay both need checking)
- [ ] Colour-contrast audit — `--color-text-dim` at 44% white on black is borderline for small text
- [ ] Lighthouse pass; the three hero/section JPEGs are ~1.8MB combined and unoptimised

## Milestone 6 — Launch readiness
- [ ] Replace `mailto:` CTAs with a real capture form (needs an endpoint — coordinate with backend or use a form service)
- [ ] Legal pages: privacy policy, terms, data handling, guardian consent — currently `href="#"` placeholders in the footer
- [ ] Analytics (privacy-preserving; the site's whole pitch is that it doesn't hoard data)
- [ ] Deployment target + CI build (nothing configured yet)
- [ ] Compress/resize the JPEGs and serve modern formats

## Milestone 7 — Boundary with the dashboard
- [ ] Extract `src/styles/index.css` tokens into a shared package both apps consume
- [ ] Dashboard starts as its **own app** — do not grow it out of this page

---

## Design system

The tokens in `src/styles/index.css` are the source of truth; nothing should hardcode a colour. The palette is deliberately monochrome:

```css
--color-bg-primary: #000000;       /* the canvas, everywhere */
--color-bg-card: #0C0C0C;          /* content cards, hairline-bordered */
--color-accent: #FFFFFF;           /* "accent" is white by design */
--color-text-primary: #FFFFFF;
--color-text-secondary: rgba(255,255,255,0.66);
--color-text-dim: rgba(255,255,255,0.44);
--color-border: rgba(255,255,255,0.14);
```

Status colours (`--color-status-green` / `-yellow` / `-red`) are the **only** hues on the site. They are semantic — they mirror the engine's verdict states — and exist solely inside the status panel and badges. Do not borrow them for decoration.

**Type.** Inter throughout. The rule that makes the page feel like the reference: large text is *light*, small text is *bold*. Section headings run 400 at up to ~3.4rem with negative tracking; eyebrow labels are 700 at 0.75rem, uppercase, wide-tracked. Inverting that will make the page look like a generic SaaS landing page immediately.

**Motion.** Everything is scroll-driven via GSAP ScrollTrigger, with Lenis smoothing the scroll itself. The architecture section pins for 300vh and cross-fades three pillars — it is the most fragile piece on the page, and it depends on `#arch-pin-spacer`, `#arch-sticky` and `#arch-layer-1..3` existing. The vision paragraph is rebuilt at runtime into per-word spans that light up on scroll; the accent-word list lives in `animations.js` and **must be updated whenever that paragraph's copy changes**.

**Imagery.** The current three JPEGs carry a cyan/neon skeletal overlay from the earlier dark-neon direction. They read acceptably on black but they are the one element still fighting the monochrome palette. When there's real footage, reshoot or re-grade them neutral.

---

## Copy rules

Write for a grassroots coach reading the site cold, not for the engineer who built it. The PRD's vocabulary — quality firewall, `p_i < 0.70`, Butterworth filtering, RTMPose, `DATA_SUPPRESSED` — belongs in the PRD and must not appear on the site. Say "if the camera can't see the bowler clearly, we say so instead of inventing a number" instead.

Keep the epistemic honesty the PRD insists on: the site may claim measurement and comparison, but never diagnosis, injury prediction, or a verdict the coach didn't make. Accuracy figures are stated as **targets being tested**, not achieved results, because the Stage 1 trial is still running — if that changes, update the metrics section and its surrounding paragraph together.

---

## Dead End Registry

**Light theme (abandoned).** The first redesign made the site white with a deep-green accent, based on a text-only fetch of ethnocare.ca that reported white backgrounds. That was wrong — the real site is `rgb(0,0,0)` with white text. Rebuilt dark. Lesson: read the actual computed styles, not a summary of the page.

**Green brand accent (abandoned).** Followed the light theme out. The accent token is retained as white so a brand colour can be reintroduced in one line if the team ever wants one, but the reference design has no accent and the site is stronger without it.

**Mobile-app framing (abandoned).** An early copy pass described an in-app stencil and on-device analysis. CoachLens is a web app; capture is just the phone's own camera.

**Logo concepts (rejected, with reasons).** A geometric angle with a proper arc — the arc detaches into a floating sliver below ~40px. A ring with a chevron inside — reads unmistakably as a media play button. A baseline-with-deviation mark — collapses into an unreadable caret at favicon size, and the closest legible form looked like an ECG trace, which is exactly the medical association the product must avoid. A three-dot joint chain — clean, but reads as a generic breadcrumb arrow.

**Preloader wordmark (superseded).** A static letter-spaced "COACHLENS" with a pulsing opacity animation, replaced by the Introducing → CoachLens sequence.

---

## Repo notes

Work happens on `dev`. Frontend and backend are separate workstreams in one repo — commit straight to `dev`, keep commits scoped to one side, and don't reformat the other side's files.

At time of writing, `node_modules` is tracked in git (440 files, committed before the ignore rule existed). It needs `git rm -r --cached node_modules` followed by a commit; `.gitignore` alone won't fix it because ignore rules don't apply to already-tracked files.
