import { useEffect, type RefObject } from 'react';
import { gsap } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

/** Drifts the giant footer wordmark in as it enters. */
export function useFooterParallax(ref: RefObject<HTMLElement | null>) {
  const ready = useAnimationsReady();

  useEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;

    const ctx = gsap.context(() => {
      gsap.from(el, {
        xPercent: -20,
        opacity: 0.3,
        scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 30%', scrub: true },
      });
    });

    return () => ctx.revert();
  }, [ready, ref]);
}
