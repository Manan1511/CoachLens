import { useEffect, type RefObject } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

/** Counts up to `target` once, on first entry. Decimal targets keep one
 *  decimal place so 4.0 doesn't land as "4". */
export function useCounter(ref: RefObject<HTMLElement | null>, target: number) {
  const ready = useAnimationsReady();

  useEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;

    const isDecimal = target % 1 !== 0;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(
            {},
            {
              duration: 2,
              ease: 'power2.out',
              onUpdate() {
                const current = target * this.progress();
                el.textContent = isDecimal ? current.toFixed(1) : String(Math.round(current));
              },
              onComplete() {
                el.textContent = isDecimal ? target.toFixed(1) : String(target);
              },
            },
          );
        },
      });
    });

    return () => ctx.revert();
  }, [ready, ref, target]);
}
