import { useRef } from 'react';
import { InfoIcon } from '@/components/icons';
import { Reveal } from '@/components/ui/Reveal';
import {
  Dim,
  SectionIntro,
  SectionLabel,
  SectionTitle,
} from '@/components/ui/SectionHeading';
import { SCIENCE_CARDS, SCIENCE_HEADER, TRANSPARENCY } from '@/content/science';
import { useMeasureLine } from '@/hooks/useMeasureLine';

/** An editorial, numbered list rather than a pair of bordered cards — a
 *  large ghost numeral per row, one hairline rule between the two
 *  measurements, and the key facts read as a plain inline line instead of
 *  little pill backgrounds. DESIGN.md's elevation rule is a hairline, never
 *  a fill, so this leans on rules and whitespace instead of boxes.
 *
 *  A curvy line drawn down the number column as the section scrolls past —
 *  from "01" toward "02" — is the one purely playful touch here, not
 *  another piece of data. */
export function Science() {
  const listRef = useRef<HTMLDivElement>(null);
  const linePathRef = useRef<SVGPathElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  useMeasureLine(listRef, linePathRef, ballRef);

  return (
    <section id="science" className="bg-canvas py-2xl">
      <div className="container">
        <Reveal className="mb-xl text-center">
          <SectionLabel centered>{SCIENCE_HEADER.label}</SectionLabel>
          <SectionTitle className="text-center">
            {SCIENCE_HEADER.title}
            <Dim>{SCIENCE_HEADER.titleAccent}</Dim>
          </SectionTitle>
          <SectionIntro>{SCIENCE_HEADER.intro}</SectionIntro>
        </Reveal>

        <div
          ref={listRef}
          className="relative mb-xl flex flex-col divide-y divide-line border-y border-line"
        >
          {/* Purely decorative — the actual measurements are the text. "01"
              sits at the left where a numeral normally would; "02" is
              pulled over to the right edge instead, so the connecting line
              has somewhere to actually travel *to* rather than just sitting
              in a narrow left-hand gutter. The line spans the row's full
              width for exactly that reason. Hidden below the breakpoint
              where the numerals drop back into a single stacked column
              (max-mobile:grid-cols-1), since neither of them line up with
              anything down there. */}
          <svg
            className="pointer-events-none absolute inset-0 size-full max-mobile:hidden"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              ref={linePathRef}
              d="M 4,4 C 55,14 8,44 46,52 C 84,60 42,88 96,96"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1}
              strokeLinecap="round"
              strokeOpacity={0.5}
              pathLength={1}
              strokeDasharray={1}
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* The ball is a plain HTML circle, positioned by percentage from
              the same path — not an SVG shape inside the viewBox above,
              which is stretched non-uniformly (preserveAspectRatio="none")
              to span the whole row and would squash a circle into an
              ellipse. */}
          <div
            ref={ballRef}
            aria-hidden
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#b5342a] opacity-0 max-mobile:hidden"
            style={{ boxShadow: 'inset 0 0 0 1px #7a2015' }}
          >
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'linear-gradient(115deg, transparent 44%, #f4e4c1 47%, #f4e4c1 50%, transparent 53%)',
              }}
            />
          </div>

          {SCIENCE_CARDS.map(({ icon: Icon, title, desc, rows }, i) => {
            // Row 1 mirrors row 0's whole block onto the right instead of
            // just its numeral — same content, flipped alignment — rather
            // than a pile of independent per-element conditionals, which is
            // exactly what produced last time's bug (one property left
            // unconditional while its siblings flipped, so the paragraph
            // drifted off on its own instead of moving with its heading).
            const flipped = i === 1;
            return (
              <Reveal
                key={title}
                className={`relative grid max-w-full gap-lg overflow-hidden py-xl max-mobile:grid-cols-1 max-mobile:gap-sm ${
                  flipped ? 'grid-cols-[1fr_4.5rem]' : 'grid-cols-[4.5rem_1fr]'
                }`}
              >
                <span
                  className={`font-heading text-h1 font-bold text-ink-muted max-mobile:col-start-1 max-mobile:text-left ${
                    flipped
                      ? 'order-2 col-start-2 text-right max-mobile:order-first'
                      : 'order-1 col-start-1'
                  }`}
                >
                  0{i + 1}
                </span>

                <div
                  className={`min-w-0 max-mobile:col-start-1 ${
                    flipped ? 'order-1 col-start-1 text-right' : 'order-2 col-start-2 text-left'
                  }`}
                >
                  <div
                    className={`mb-sm flex items-center gap-3 max-mobile:justify-start ${
                      flipped ? 'justify-end' : ''
                    }`}
                  >
                    <Icon className="size-6 shrink-0 text-accent" />
                    <h3 className="text-h3">{title}</h3>
                  </div>
                  <p
                    className={`mb-md max-w-[600px] leading-[1.8] text-ink-secondary max-mobile:ml-0 max-mobile:text-left ${
                      flipped ? 'ml-auto' : ''
                    }`}
                  >
                    {desc}
                  </p>

                  <div
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-small max-mobile:justify-start ${
                      flipped ? 'justify-end' : ''
                    }`}
                  >
                    {rows.map((row, j) => (
                      <span key={row.label} className="flex items-center gap-1.5">
                        {j > 0 && <span className="text-ink-muted">/</span>}
                        <span className="text-ink-dim">{row.label}</span>
                        <span className="font-heading font-semibold text-ink">{row.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* The worked example, as a two-step reasoning chain rather than a
            bordered callout — "what we saw" connects to "what it might
            mean" via the same kind of thread as the curvy line above,
            instead of a boxed two-column card. */}
        <Reveal className="mx-auto max-w-[560px] text-center">
          <div className="mb-md flex items-center justify-center gap-2.5">
            <InfoIcon className="size-4 shrink-0 text-ink-dim" />
            <span className="text-caption font-bold tracking-[0.15em] uppercase text-ink-dim">
              {TRANSPARENCY.badge}
            </span>
          </div>

          <h3 className="mb-lg text-h3 font-normal">{TRANSPARENCY.title}</h3>

          <div className="mb-lg flex flex-col text-left">
            {TRANSPARENCY.columns.map((col, i) => (
              <div key={col.heading} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ink-muted" />
                  {i < TRANSPARENCY.columns.length - 1 && (
                    <span className="my-1 w-px flex-1 bg-line" />
                  )}
                </div>
                <div className="pb-sm">
                  <h4 className="mb-1 text-small tracking-[0.05em] uppercase text-ink-dim">
                    {col.heading}
                  </h4>
                  <p className="text-small leading-[1.7] text-ink-secondary">{col.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-xs">
            {TRANSPARENCY.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`rounded-full border px-4 py-1.5 text-caption font-semibold transition-all duration-200 ${
                  action.primary
                    ? 'border-accent bg-accent text-canvas'
                    : 'border-line text-ink-secondary hover:border-accent hover:text-accent'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
