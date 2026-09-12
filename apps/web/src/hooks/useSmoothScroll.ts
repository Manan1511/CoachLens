import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { setLenis } from '@/lib/lenis';

/** Lenis smooth scroll, driven by GSAP's ticker and feeding ScrollTrigger.
 *
 *  The old site ran Lenis and ScrollTrigger as two independent scroll
 *  systems — ScrollTrigger never learned about Lenis's interpolated
 *  position, so pinned sections and scrubbed timelines tracked the native
 *  scroll while the page moved on Lenis's. Wiring them here is what makes
 *  the pin stay in step with the content. */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    setLenis(lenis);
    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, [enabled]);
}
