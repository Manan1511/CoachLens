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

      // `start: 'top top'` is scroll position zero for this, the page's
      // first section — so the "from" state here is exactly what a visitor
      // sees before they ever scroll. It used to be yPercent: -4, which
      // meant the resting frame was already shifted up by 4% of the
      // image's height rather than the plain, centred crop this cover
      // image is meant to rest at; only scrolling down ever revealed
      // anything past that. Starting at 0 fixes the resting position and
      // keeps the same total drift on the way down.
      gsap.fromTo(
        '.hero-image',
        { scale: 1.12, yPercent: 0 },
        {
          yPercent: 4,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
        },
      );

      // Splits the wordmark on the same scroll range as the background's
      // parallax above: the left half lifts up-and-left, the right half
      // up-and-right, fading out as they go — a curtain opening onto
      // whatever the visitor scrolls into next, not a plain scroll-away.
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
