import { useEffect, type RefObject } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

const RADIUS = 420;

/** Pins the section for one scroll pass and carries the step cards around
 *  a circular track — reactbits' circular-gallery motion (cards arranged
 *  on a ring, the ring rotating past a fixed "front" position) ported to
 *  plain CSS 3D transforms instead of its WebGL/OGL renderer, since this
 *  page has no other WebGL surface to justify that dependency.
 *
 *  Only `count` (4) elements are touched per tick, each with one `gsap.set`
 *  — the whole cost is a handful of trig calls, not a re-render. */
export function useCircularSteps(
  spacerRef: RefObject<HTMLElement | null>,
  stickyRef: RefObject<HTMLElement | null>,
  count: number,
) {
  const ready = useAnimationsReady();

  useEffect(() => {
    const spacer = spacerRef.current;
    const sticky = stickyRef.current;
    if (!ready || !spacer || !sticky || count === 0) return;

    const cards = Array.from(sticky.querySelectorAll<HTMLElement>('.circular-step-card'));
    if (cards.length === 0) return;

    const angleStep = 360 / count;

    const place = (rotation: number) => {
      cards.forEach((card, i) => {
        const angle = ((i * angleStep + rotation) * Math.PI) / 180;
        const x = Math.sin(angle) * RADIUS;
        const z = Math.cos(angle) * RADIUS - RADIUS;
        // 1 when the card is dead-centre-front, 0 at the back of the ring.
        const closeness = (Math.cos(angle) + 1) / 2;

        gsap.set(card, {
          xPercent: -50,
          yPercent: -50,
          x,
          z,
          scale: 0.62 + closeness * 0.38,
          opacity: 0.25 + closeness * 0.75,
          zIndex: Math.round(closeness * 100),
        });
      });
    };

    place(0);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: spacer,
        start: 'top top',
        end: 'bottom bottom',
        pin: sticky,
        scrub: true,
        // Negated so scrolling down advances the ring in step order
        // (1→2→3→4 arriving from the right) instead of backwards.
        onUpdate: (self) => place(-self.progress * 360),
      });
    });

    return () => ctx.revert();
  }, [ready, spacerRef, stickyRef, count]);
}
