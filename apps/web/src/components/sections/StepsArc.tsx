import { useRef } from 'react';
import { WordmarkText } from '@/components/icons';
import { Reveal, Stagger } from '@/components/ui/Reveal';
import { Dim, SectionLabel, SectionTitle } from '@/components/ui/SectionHeading';
import { STEPS, STEPS_HEADER } from '@/content/steps';
import { useCircularSteps } from '@/hooks/useCircularSteps';

const PIN_VH = 220;

function StepCardContent({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <>
      <div className="mb-sm flex size-14 shrink-0 items-center justify-center rounded-full border border-line-strong bg-canvas font-heading text-h4 text-ink">
        {step.number}
      </div>
      <span className="mb-1 block text-caption font-bold tracking-[0.15em] uppercase text-accent">
        {step.label}
      </span>
      <h3 className="mb-2 text-h4">
        <WordmarkText text={step.title} />
      </h3>
      <p className="text-small leading-[1.5] text-ink-secondary">{step.desc}</p>
    </>
  );
}

/** Desktop/tablet: reactbits' circular-gallery motion — cards on a ring
 *  that rotates as the section pins, one card at a time drifting to the
 *  front — rebuilt in plain CSS 3D transforms (see useCircularSteps)
 *  instead of pulling in the original's WebGL/OGL renderer, since nothing
 *  else on this page needs a WebGL context. */
function CircularSteps() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  useCircularSteps(spacerRef, stickyRef, STEPS.length);

  return (
    <div ref={spacerRef} className="relative hidden md:block" style={{ height: `${PIN_VH}vh` }}>
      <div
        ref={stickyRef}
        className="sticky top-0 flex h-screen items-center justify-center overflow-hidden"
        style={{ perspective: '1400px' }}
      >
        {STEPS.map((step) => (
          <div
            key={step.number}
            className="circular-step-card absolute left-1/2 top-1/2 flex w-72 flex-col rounded-md border border-line-strong bg-surface p-lg text-left shadow-glow"
          >
            <StepCardContent step={step} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mobile: the same cards, revealed as a normal stagger-on-scroll stack
 *  rather than a pinned 3D ring — a phone viewport has no room for the
 *  perspective this needs to read as circular. */
function StaticSteps() {
  return (
    <Stagger className="container flex flex-col gap-md md:hidden">
      {STEPS.map((step) => (
        <div
          key={step.number}
          className="flex flex-col rounded-md border border-line bg-surface p-lg text-left"
        >
          <StepCardContent step={step} />
        </div>
      ))}
    </Stagger>
  );
}

export function StepsArc() {
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
      </div>

      <CircularSteps />
      <StaticSteps />
    </section>
  );
}
