import { useEffect, useState, type RefObject } from 'react';
import { gsap } from '@/lib/gsap';
import { getLenis } from '@/lib/lenis';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface IntroRefs {
  overlay: RefObject<HTMLDivElement | null>;
  eyebrow: RefObject<HTMLParagraphElement | null>;
  brand: RefObject<HTMLDivElement | null>;
}

/** "Presenting" → "CoachLens", with the L drawn as an acute angle.
 *
 *  Holds the page still while it plays and always resolves: a 6s safety
 *  timeout means a stalled animation can never trap a visitor on a black
 *  screen. Returns `done`, which gates every scroll animation on the page. */
export function useIntro({ overlay, eyebrow, brand }: IntroRefs) {
  const [done, setDone] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // No "already played" guard here: StrictMode mounts, cleans up, then
    // mounts again, and a guard would leave the killed first timeline as
    // the only one — stranding the visitor on the overlay. Letting the
    // effect re-run rebuilds the timeline from scratch instead.
    const overlayEl = overlay.current;
    const eyebrowEl = eyebrow.current;
    const brandEl = brand.current;

    const finish = () => {
      overlayEl?.setAttribute('data-hidden', 'true');
      getLenis()?.start();
      document.body.style.overflow = '';
      setDone(true);
    };

    if (!overlayEl || !eyebrowEl || !brandEl || reducedMotion) {
      gsap.set([eyebrowEl, brandEl].filter(Boolean), { opacity: 1, y: 0 });
      const skip = setTimeout(finish, 600);
      return () => clearTimeout(skip);
    }

    getLenis()?.stop();
    document.body.style.overflow = 'hidden';

    const strokes = overlayEl.querySelectorAll<SVGPathElement>('.intro-angle-stroke');
    strokes.forEach((path) => {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    });

    const safety = setTimeout(finish, 6000);

    const tl = gsap.timeline({
      onComplete: () => {
        clearTimeout(safety);
        finish();
      },
    });

    tl.to(eyebrowEl, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' })
      .to(eyebrowEl, { opacity: 0, y: -12, duration: 0.45, ease: 'power2.in' }, '+=0.5')
      .to(brandEl, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' }, '-=0.15')
      .to(strokes, { strokeDashoffset: 0, duration: 0.55, stagger: 0.12, ease: 'power2.out' }, '-=0.55')
      .to(overlayEl, { opacity: 0, duration: 0.7, ease: 'power2.inOut' }, '+=0.75');

    return () => {
      clearTimeout(safety);
      tl.kill();
    };
  }, [overlay, eyebrow, brand, reducedMotion]);

  return done;
}
