import { useRef } from 'react';
import { Reveal, Stagger } from '@/components/ui/Reveal';
import { Dim, SectionLabel, SectionTitle } from '@/components/ui/SectionHeading';
import { STEPS, STEPS_HEADER } from '@/content/steps';

/* Node positions along a semicircle, precomputed in a 1000×520 viewBox
   (center 500,460, radius 380, angles 180°→0° in three even steps) so the
   arc's SVG path and the HTML nodes share one coordinate system — no
   runtime measuring needed. */
const VIEWBOX_W = 1000;
const VIEWBOX_H = 520;
const ARC_PATH = 'M120,460 A380,380 0 0 1 880,460';
const NODE_POSITIONS = [
  { x: 120, y: 460 },
  { x: 310, y: 131 },
  { x: 690, y: 131 },
  { x: 880, y: 460 },
];

export function StepsArc() {
  const pathRef = useRef<SVGPathElement>(null);

  return (
    <section id="how-it-works" className="py-2xl">
      <div className="container">
        <Reveal className="mb-xl text-center">
          <SectionLabel centered>{STEPS_HEADER.label}</SectionLabel>
          <SectionTitle className="text-center">
            {STEPS_HEADER.title}
            <Dim>{STEPS_HEADER.titleAccent}</Dim>
          </SectionTitle>
        </Reveal>

        <div
          className="relative mx-auto w-full max-w-4xl"
          style={{ aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}` }}
        >
          <Reveal
            as="svg"
            className="absolute inset-0 size-full !translate-y-0 !opacity-100"
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            fill="none"
            aria-hidden
          >
            <path
              ref={pathRef}
              d={ARC_PATH}
              stroke="var(--color-line-strong)"
              strokeWidth={1.5}
              strokeDasharray={1}
              pathLength={1}
              className="draw-path"
            />
          </Reveal>

          <Stagger className="absolute inset-0">
            {STEPS.map((step, i) => {
              const pos = NODE_POSITIONS[i];
              return (
                <div
                  key={step.number}
                  className="absolute flex w-[13.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center max-mobile:w-[8.5rem]"
                  style={{
                    left: `${(pos.x / VIEWBOX_W) * 100}%`,
                    top: `${(pos.y / VIEWBOX_H) * 100}%`,
                  }}
                >
                  <div className="mb-sm flex size-16 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface font-heading text-h3 text-ink max-mobile:size-11 max-mobile:text-h4">
                    {step.number}
                  </div>
                  <span className="mb-1 text-caption font-bold tracking-[0.15em] uppercase text-accent">
                    {step.label}
                  </span>
                  <h3 className="mb-1 text-h4 max-mobile:text-small">{step.title}</h3>
                  <p className="text-small leading-[1.5] text-ink-secondary max-mobile:hidden">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
