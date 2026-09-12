import { useEffect, useState } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

/** Visible between the end of the hero and the start of the CTA section. */
export function useFloatingCta(): boolean {
  const ready = useAnimationsReady();
  const [pastHero, setPastHero] = useState(false);
  const [atCta, setAtCta] = useState(false);

  useEffect(() => {
    if (!ready) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: '#hero',
        start: 'bottom top',
        onEnter: () => setPastHero(true),
        onLeaveBack: () => setPastHero(false),
      });

      ScrollTrigger.create({
        trigger: '#cta',
        start: 'top 80%',
        onEnter: () => setAtCta(true),
        onLeaveBack: () => setAtCta(false),
      });
    });

    return () => ctx.revert();
  }, [ready]);

  return pastHero && !atCta;
}
