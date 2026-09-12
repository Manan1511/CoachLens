import { useEffect, type RefObject } from 'react';
import { gsap } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

/** Hero entry: the scroll indicator fades in, then the wordmark splits
 *  apart on scroll. Runs only once the intro overlay is gone. The wordmark
 *  itself has no entrance animation here — it's static from the first
 *  frame, because it's meant to read as the intro's own "CoachLens"
 *  arriving and settling, not a second one loading in afterward (see
 *  useIntro.ts and Hero.tsx). */
export function useHeroTimeline(ref: RefObject<HTMLElement | null>) {
  const ready = useAnimationsReady();

  useEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;

    const ctx = gsap.context(() => {
      gsap.to('.hero-scroll-indicator', {
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.6,
      });

      // Splits the wordmark as the hero scrolls past: the left half lifts
      // up-and-left, the right half up-and-right, fading out as they go —
      // a curtain opening onto whatever the visitor scrolls into next, not
      // a plain scroll-away.
      gsap.fromTo(
        '.hero-word-left',
        { x: 0, y: 0, opacity: 1 },
        {
          x: '-30vw',
          y: '-70vh',
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
        },
      );

      gsap.fromTo(
        '.hero-word-right',
        { x: 0, y: 0, opacity: 1 },
        {
          x: '30vw',
          y: '-70vh',
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [ready, ref]);
}
