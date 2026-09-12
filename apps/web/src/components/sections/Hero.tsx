import { useRef } from 'react';
import { useHeroTimeline } from '@/hooks/useHeroTimeline';

/** The wordmark, dead-centre, on a plain black canvas — a continuation of
 *  the intro's centred "CoachLens" rather than a headline-and-photo hero. */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  useHeroTimeline(ref);

  return (
    <section
      ref={ref}
      id="hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas"
    >
      {/* Static from the first frame, not faded/translated in — the intro
          overlay's own "CoachLens" grows to this size and this exact
          (centred) spot right before it fades away, so this wordmark reads
          as that same text settling into place rather than a second,
          separate one loading in behind it. See useIntro.ts's final scale
          step. Two independently-transformable halves rather than the
          shared Wordmark component — at rest they sit flush against each
          other and read as one word, but useHeroTimeline splits and lifts
          them apart on scroll (one up-and-left, one up-and-right), a
          curtain reveal for the section behind. The split point matches
          Wordmark's own Coach/Lens weight break, not an arbitrary letter
          count. */}
      <h1 className="hero-wordmark relative z-[2] text-giant leading-none tracking-[-0.03em] text-ink">
        <span className="hero-word-left inline-block whitespace-nowrap font-normal">Coach</span>
        <span className="hero-word-right inline-block whitespace-nowrap font-bold">
          <span className="intro-angle" aria-hidden>
            <svg viewBox="0 0 34 64" fill="none" stroke="currentColor" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 59 L27 6" />
              <path d="M7 59 L31 59" />
            </svg>
          </span>
          ens
        </span>
        <span className="visually-hidden">CoachLens</span>
      </h1>

      <div className="hero-scroll-indicator animate-float absolute bottom-12 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center gap-2 opacity-0">
        <div className="h-10 w-px bg-linear-to-b from-accent to-transparent" />
        <span className="text-[0.65rem] tracking-[0.2em] uppercase text-ink-dim">Scroll</span>
      </div>
    </section>
  );
}
