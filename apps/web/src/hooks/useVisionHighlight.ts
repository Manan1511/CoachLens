import { useEffect, type RefObject } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

/** Pins the statement in place and lights it word by word as the visitor
 *  scrolls through a dedicated span of empty scroll distance — the page
 *  genuinely holds still until the whole sentence is lit, then releases
 *  into normal scroll, rather than the words lighting up as the section
 *  scrolls past at the same time (which read as racing past the text
 *  rather than pausing on it).
 *
 *  The words are rendered by React as `.vision-word` spans; this hook only
 *  toggles their data-state. The old version tore down the paragraph's
 *  textContent and rebuilt it in JS, which React can't safely share. */
export function useVisionHighlight(
  spacerRef: RefObject<HTMLElement | null>,
  stickyRef: RefObject<HTMLElement | null>,
) {
  const ready = useAnimationsReady();

  useEffect(() => {
    const spacer = spacerRef.current;
    const sticky = stickyRef.current;
    if (!ready || !spacer || !sticky) return;

    const words = Array.from(sticky.querySelectorAll<HTMLElement>('.vision-word'));
    if (words.length === 0) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: spacer,
        start: 'top top',
        end: 'bottom bottom',
        pin: sticky,
        scrub: true,
        onUpdate: (self) => {
          // Finishes lighting the last word at 75% of the way through the
          // pinned scroll distance, not 100% — the remaining quarter is a
          // held beat on the fully-lit sentence before the page is let go,
          // which is the actual "pause, then move on" this is meant to be.
          const activeIndex = Math.floor((self.progress / 0.75) * words.length);

          words.forEach((word, i) => {
            if (i <= activeIndex) {
              word.setAttribute(
                'data-state',
                word.dataset.accent === 'true' ? 'accent' : 'lit',
              );
            } else {
              word.removeAttribute('data-state');
            }
          });
        },
      });
    }, spacer);

    return () => ctx.revert();
  }, [ready, spacerRef, stickyRef]);
}
