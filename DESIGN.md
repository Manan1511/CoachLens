# CoachLens — Design System

Reference: [ethnocare.ca](https://ethnocare.ca/). This document records the design language borrowed from it, the specific choices made from it, and the tokens/patterns that implement them in `apps/web/`. It is the frontend's design reference — `FRONTEND_PLAN.md` tracks build status, this tracks *why the site looks the way it does*.

Covers both surfaces in `apps/web/`: the marketing site (`/`) and the coach dashboard (`/app/*`). §1–5 are marketing-site-specific — the dashboard shares the tokens (§2) but not the scroll choreography. See §7.

## 1. What we took from ethnocare, specifically

Not "a dark theme" — these five concrete patterns, observed directly on the live site (see the Dead End Registry in `FRONTEND_PLAN.md` for what happens when you design from a text summary instead of the real thing):

1. **Pure black canvas, white type.** `rgb(0,0,0)` background, not a dark grey. No card ever gets a colour of its own — elevation is a hairline border, never a fill.
2. **Weight inversion.** Large statements (headlines, giant wordmarks) are set at regular weight (400). Small labels (eyebrows, nav links, badges) are bold and wide-tracked. Ethnocare's nav ("OVERLAY", "ACCESSORIES") is thin and huge; its labels ("STEP", category tags) are small and heavy. Inverting this — bold headlines, thin labels — is the fastest way to make the page look like a generic SaaS template instead.
3. **The centred wordmark moment.** Ethnocare's product page opens with "Introducing" fading to a giant "OVERLAY" dead-centre in the viewport, a dimmed product photo behind it. We reused this exact beat twice: once in the intro overlay ("Presenting" → "CoachLens"), and again as the hero itself (the wordmark stays centred, the bowler photo dimmed in behind it) rather than moving on to a headline-and-photo layout.
4. **One accent hue, used sparingly.** Ethnocare's own UI (its cookie-consent "Accept" button) uses a single saturated blue against the black-and-white palette — not decoration, a highlight. We reused that specific move for one job only: lighting up key words in the vision statement as it scrolls. It does not appear anywhere else on the site.
5. **The step arc.** Ethnocare lays its numbered usage steps ("STEP 01–05") along a curved path rather than a grid. We rebuilt this as an explicit semicircle for the "how it works" section, with the connecting line drawing itself on as the section enters view.

Explicitly *not* taken: ethnocare's canvas/WebGL product-rotation hero. We don't have 3D product geometry, and forcing one would be decoration, not signal. The bowler's motion is a photo with a small scroll-tied bob instead — see §5.

## 2. Tokens

Source of truth: [`apps/web/src/styles/theme.css`](apps/web/src/styles/theme.css) (Tailwind v4 `@theme`, so every token below is both a CSS custom property and a matching utility class — `bg-surface` and `var(--color-surface)` always agree).

### Colour

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#000000` | The page background. Everywhere. |
| `--color-surface` | `#0c0c0c` | Cards, panels — one step off black |
| `--color-surface-hover` | `#151515` | Hover state on the above |
| `--color-ghost` | `#141414` | Oversized decorative numerals (step counters, footer wordmark) |
| `--color-ink` | `#ffffff` | Primary text |
| `--color-ink-secondary` | `rgba(255,255,255,.66)` | Body copy |
| `--color-ink-dim` | `rgba(255,255,255,.44)` | Captions, de-emphasis |
| `--color-ink-muted` | `rgba(255,255,255,.2)` | Unlit/pending state (unrevealed vision words, unrevealed advantages) |
| `--color-accent` | `#ffffff` | The "brand colour" is white, on purpose — see §1.4 |
| `--color-accent-blue` | `#3b82f6` | **Scoped to the vision word-highlight only.** Do not reuse elsewhere; see §4 |
| `--color-line` / `--color-line-strong` | `rgba(255,255,255,.14 / .4)` | Hairline borders — the site's only elevation mechanism |
| `--color-status-green/yellow/red` | `#5fd39b` / `#e5b85c` / `#f0776c` | Semantic verdict states only. Never decorative. |

### Type

One family: Inter. The scale is entirely `clamp()`-based so nothing needs a manual breakpoint override:

`--text-giant` (3.5rem→10rem) · `--text-hero` · `--text-h1` … `--text-h4` · `--text-body` · `--text-small` · `--text-caption` (fixed 0.75rem), plus section-specific display sizes (`--text-hero-title`, `--text-statement`, `--text-numeral`, `--text-metric`, `--text-cta-title`, `--text-intro-brand`, …) for the handful of places that need a size no shared token covers.

**Rule:** headings default to weight 400. Bold is opt-in, reserved for eyebrows (`text-caption font-bold tracking-[0.12em] uppercase`), the logo's "Lens", and small UI labels. If a heading needs bold, that's a signal the type scale is being asked to do a label's job.

### Spacing, radius, motion

- Spacing: `--spacing-xs` (0.5rem) through `--spacing-2xl` (9rem) — section padding uses `xl`/`2xl`, component padding uses `sm`/`md`.
- Radius: `--radius-sm` (6px) → `--radius-xl` (28px). Nothing is fully square; nothing is a pill except buttons, badges, and the nav's link group.
- Easing: `--ease-smooth` (general UI), `--ease-out-expo` (reveals, the mobile menu), `--ease-bounce` (unused currently, reserved for playful confirmations).
- Elevation: `--shadow-glow` / `-strong` are **1px inset rings, not shadows** — a drop shadow is invisible on pure black, so "lift" reads as a hairline brightening instead.

### Breakpoints

Two, and only two: `--breakpoint-tablet` (900px, nav collapses to the hamburger menu, hero-style layouts stack) and `--breakpoint-mobile` (640px, grids go single-column). Used as Tailwind's `max-tablet:` / `max-mobile:` variants. Resist adding a third — the two-breakpoint discipline is what keeps the responsive CSS legible.

### A token-naming gotcha

The spacing scale's key names (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`) are the same names Tailwind's built-in `max-w-*`/`w-*` container scale uses. Because `--spacing-sm` etc. are defined in this `@theme` block, they win over Tailwind's own `--container-sm` when a `max-w-sm` (or `w-sm`, `min-w-sm`, …) utility is used — it silently resolves to the *spacing* value (1rem) instead of the intended container width (24rem). This bit the dashboard's login card and page-width wrappers. **Don't use `max-w-{xs,sm,md,lg,xl,2xl}` anywhere in this codebase** — use an explicit value instead (`max-w-[24rem]`, `max-w-[42rem]`) or the existing `max-w-(--container-max)` pattern already used in `Nav.tsx`. `max-w-3xl`/`max-w-4xl`/`max-w-7xl` etc. are unaffected, since no spacing token shares those names.

## 3. Motion language

Two libraries, one rule for how they interact: **Lenis drives the actual scroll, GSAP ScrollTrigger reads it** — they're wired together (`lenis.on('scroll', ScrollTrigger.update)`), not running independently, so anything pinned or scrubbed stays in lockstep with what the visitor feels under their finger.

Every scroll-driven effect is a small typed hook in `apps/web/src/hooks/` (`useReveal`, `useCounter`, `useVisionHighlight`, `useAdvantagesScroll`, `useHeroTimeline`, …), each wrapped in `gsap.context()` so React re-renders and StrictMode's double-mount can't leak duplicate ScrollTriggers. Nothing plays before `useAnimationsReady()` is true — that flag flips only once the intro overlay has finished, so scroll animations never run out of sight behind it.

Patterns, by name:

- **Reveal** — fade + lift on first entry (`opacity:0, translateY(40px) → 1, 0`). The page's default "this just appeared" motion.
- **Stagger** — same, but a group's children step in on `nth-child` delays. Used for card grids and the arc's four nodes.
- **Scroll-scrubbed highlight** — the vision statement's words light up (and the accent set turns blue) tied directly to scroll progress through the section, not to a timer.
- **Pinned accumulation** — the "advantages" section pins for one long scroll pass; items light up one at a time and *stay* lit, so it reads as a checklist filling in, not a slideshow swapping frames. (The three-pillar version of this used to swap layers entirely — we moved away from that in favour of accumulation, since it survives longer copy better.)
- **Draw-on stroke** — the intro's angled "L" and the step arc's connecting line both use `pathLength="1"` + `stroke-dasharray/offset`, so the line looks hand-drawn on scroll/timeline without any JS path-length measuring.
- **Scroll-tied idle motion** — the bowler photo in the advantages section gets a small sine-driven bob/drift keyed to scroll progress (`yPercent`, slight rotate) — motion without a real frame sequence, until one exists to replace it.

Always respect `prefers-reduced-motion`: the intro short-circuits to a plain 600ms fade, and reveal/stagger/pulse animations collapse to their end state with no transition.

## 4. Section-by-section

| Section | Pattern used | Notes |
|---|---|---|
| **Intro** | Centred wordmark, draw-on stroke | "Presenting" and "CoachLens" occupy the *same* grid cell (CSS grid stacking) so the brand cross-fades in exactly where the eyebrow was — never stacked below it |
| **Hero** | Centred wordmark (again), dimmed background | No headline, no subtitle, no buttons — the brand carries the section alone, mirroring ethnocare's product-name hero. Image at ~16% opacity, grayscale, so it reads as texture, not a photo |
| **Vision** | Scroll-scrubbed highlight | Short statement, words move `muted → lit (white) → accent (blue)` as you scroll. Accent word list lives with the copy in `content/vision.ts` so they can't drift apart |
| **Advantages** | Pinned accumulation + idle motion | Bowler photo (fixed) + a 9-item checklist (grouped Measured/Compared/Coach-led) that fills in one item per scroll increment. Falls back to a plain static list on mobile — nine pinned steps don't fit a phone viewport without clipping |
| **Steps** | Semicircular draw-on arc | Four numbered nodes on a `pathLength`-normalized arc; the connecting line draws on as the section enters view, nodes stagger in after it |
| **Science / Metrics / Specs / CTA / Footer** | Reveal / Stagger / counters | Standard card grids and count-up metrics — no reason to depart from ethnocare's plainer patterns here, since these sections are informational, not narrative |

## 5. Imagery

Two roles only, never mixed:

- **Texture** (Hero) — dimmed, grayscale, behind type. Never the focal point.
- **Diagram** (Advantages) — the skeletal-overlay bowler photo, shown at real contrast because it's doing explanatory work (joint tracking), not decorating.

The three source JPEGs still carry a cyan skeletal-overlay grade from an earlier direction (see Dead End Registry) — acceptable on black, but the one thing still fighting full monochrome. Reshoot/re-grade neutral when real footage exists.

## 6. Things to not do

- Don't add a second accent colour. If something needs emphasis, dim its neighbours (`text-ink-dim`) rather than reaching for a hue.
- Don't make a headline bold. If it needs weight, it's not a headline — demote it to a label.
- Don't give a card a fill colour for "emphasis." Borders and glow rings are the only lift the palette has.
- Don't add a third breakpoint. Restructure the two-breakpoint layout instead.
- Don't let a scroll animation start before `useAnimationsReady()` — even a "small" one will visibly play out of sync with the intro overlay's release.

## 7. The dashboard: what carries over, what doesn't

Same app, same build, one entry point — the marketing nav links to `/app`, and `/app/*` is the coach dashboard. But it is deliberately **not** a continuation of the marketing page's visual identity. A coach reviewing flagged deliveries needs a calm, scannable utility screen; the marketing page's whole job is the opposite — to hold attention through a scripted narrative. Building the dashboard as "the marketing page with tables bolted on" would fight both audiences at once.

**Carries over (§2 tokens, unchanged):**
- The canvas/surface/ink/line colour scale, exactly as defined — still pure black, still hairline-bordered elevation.
- The type scale and the weight-inversion rule (§1.2) — labels bold and small, content regular weight.
- `--color-status-green/yellow/red` — and here they finally get to do real work. This is the one part of the token set the marketing site could only gesture at (a status-panel mockup); the dashboard is where these colours are load-bearing, tied directly to real verdict states. Still: semantic only, never decorative, never a fourth hue added for anything else.
- Radii, spacing scale, `focus-visible` treatment.

**Does not carry over:**
- No Lenis smooth-scroll, no GSAP ScrollTrigger, no intro overlay, no `useAnimationsReady()` gating. The dashboard is a standard nav-and-content app — native scroll, instant interaction. Scroll hijacking has no place in a screen someone uses many times a day to make real decisions.
- No centred giant wordmarks, no pinned sections, no scroll-scrubbed reveals. Content appears because a coach navigated to it, not because they scrolled far enough.
- No narrative section order. The dashboard's structure is navigational (roster → athlete → delivery), not a scripted top-to-bottom story.
- `--color-accent-blue` (§2, §4) stays scoped to the marketing site's vision-statement highlight. It does not mean anything on the dashboard — don't reach for it there.

**New pattern the dashboard introduces:** progressive disclosure as an information-architecture rule, not a scroll effect. Where the marketing site reveals content by scrolling into it, the dashboard reveals it by drill-down and disclosure: a roster card shows almost nothing, an athlete page shows less than it could, a delivery report opens on just the verdict and tucks evidence behind a named disclosure. Motion here is limited to ordinary UI transitions (an accordion opening, a hover state) — never a scroll-driven timeline.
