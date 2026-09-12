import { useEffect, type RefObject } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

/** Lights the statement word by word as it scrolls through.
 *
 *  The words are rendered by React as `.vision-word` spans; this hook only
 *  toggles their data-state. The old version tore down the paragraph's
 *  textContent and rebuilt it in JS, which React can't safely share. */
export function useVisionHighlight(ref: RefObject<HTMLElement | null>) {
  const ready = useAnimationsReady();

  useEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;

    const words = Array.from(el.querySelectorAll<HTMLElement>('.vision-word'));
    if (words.length === 0) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 70%',
        end: 'bottom 40%',
        scrub: true,
        onUpdate: (self) => {
          // The 1.3 overscan finishes the sentence slightly before the
          // section leaves, so the last words aren't lit off-screen.
          const activeIndex = Math.floor(self.progress * words.length * 1.3);

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
    }, el);

    return () => ctx.revert();
  }, [ready, ref]);
}
