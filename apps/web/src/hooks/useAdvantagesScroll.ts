import { useEffect, useState, type RefObject } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

/** Pins the section for one scroll pass. As the visitor scrolls, advantages
 *  reveal one at a time (via React state — it only changes `count` times)
 *  and the bowler photo gets a continuous scroll-tied bob and drift,
 *  standing in for the frame-by-frame sequence a real capture would use.
 *  The motion is applied straight to `imageRef` through gsap rather than
 *  through state, since it would otherwise re-render on every scrub tick. */
export function useAdvantagesScroll(
  spacerRef: RefObject<HTMLElement | null>,
  stickyRef: RefObject<HTMLElement | null>,
  imageRef: RefObject<HTMLElement | null>,
  count: number,
): number {
  const ready = useAnimationsReady();
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const spacer = spacerRef.current;
    const sticky = stickyRef.current;
    const image = imageRef.current;
    if (!ready || !spacer || !sticky || count === 0) return;

    let lastRevealed = -1;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: spacer,
        start: 'top top',
        end: 'bottom bottom',
        pin: sticky,
        scrub: true,
        onUpdate: (self) => {
          const next = Math.min(count, Math.ceil(self.progress * count));
          if (next !== lastRevealed) {
            lastRevealed = next;
            setRevealed(next);
          }

          if (image) {
            const bob = Math.sin(self.progress * Math.PI * count) * 2.5;
            gsap.set(image, {
              yPercent: bob,
              xPercent: -2 + self.progress * 4,
              rotate: bob * 0.3,
            });
          }
        },
      });
    });

    return () => ctx.revert();
  }, [ready, spacerRef, stickyRef, imageRef, count]);

  return revealed;
}
