import { useEffect, type RefObject } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

/** Hero entry: the wordmark settles in, the dimmed background drifts on a
 *  slow parallax. Runs only once the intro overlay is gone. */
export function useHeroTimeline(ref: RefObject<HTMLElement | null>) {
  const ready = useAnimationsReady();

  useEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;

    const ctx = gsap.context(() => {
      gsap.to('.hero-wordmark', {
        y: 0,
        opacity: 1,
        duration: 1.1,
        ease: 'expo.out',
        delay: 0.15,
      });

      gsap.to('.hero-scroll-indicator', {
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.6,
      });

      gsap.fromTo(
        '.hero-image',
        { scale: 1.12, yPercent: -4 },
        {
          yPercent: 4,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
        },
      );

      // The pin geometry further down the page is measured against a
      // layout that includes this image; refresh once it has real height.
      const img = el.querySelector<HTMLImageElement>('.hero-image');
      if (img && !img.complete) {
        img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
      }
    }, el);

    return () => ctx.revert();
  }, [ready, ref]);
}
