import { useEffect, type RefObject } from 'react';
import { ScrollTrigger } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

/** Adds data-visible once the element crosses the trigger point.
 *  One trigger per element, owned by the element — no global sweep. */
export function useReveal(ref: RefObject<HTMLElement | null>, start = 'top 85%') {
  const ready = useAnimationsReady();

  useEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;

    const trigger = ScrollTrigger.create({
      trigger: el,
      start,
      once: true,
      onEnter: () => el.setAttribute('data-visible', 'true'),
    });

    return () => trigger.kill();
  }, [ready, ref, start]);
}
