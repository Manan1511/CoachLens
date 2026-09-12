import { useRef } from 'react';
import { HERO } from '@/content/hero';
import { useHeroTimeline } from '@/hooks/useHeroTimeline';

/** The wordmark, dead-centre, with the bowler photo dimmed in behind it —
 *  a continuation of the intro's centred "CoachLens" rather than a
 *  headline-and-photo hero. */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  useHeroTimeline(ref);

  return (
    <section
      ref={ref}
      id="hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas"
    >
      <div className="absolute inset-0">
        <img
          className="hero-image size-full object-cover opacity-[0.16] grayscale"
          src={HERO.image.src}
          alt={HERO.image.alt}
          width={HERO.image.width}
          height={HERO.image.height}
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-canvas/40 via-transparent to-canvas" />
      </div>

      <h1
        className="hero-wordmark relative z-[2] translate-y-6 whitespace-nowrap text-giant leading-none tracking-[-0.03em] text-ink opacity-0"
        aria-label={`${HERO.wordFirst}${HERO.wordSecond}`}
      >
        <span className="font-normal">{HERO.wordFirst}</span>
        <span className="font-semibold">{HERO.wordSecond}</span>
      </h1>

      <div className="hero-scroll-indicator animate-float absolute bottom-12 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center gap-2 opacity-0">
        <div className="h-10 w-px bg-linear-to-b from-accent to-transparent" />
        <span className="text-[0.65rem] tracking-[0.2em] uppercase text-ink-dim">Scroll</span>
      </div>
    </section>
  );
}
