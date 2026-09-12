import { useEffect, type RefObject } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

/** Pins the section for one scroll pass and swaps between `slideCount`
 *  full-panel slides — the ethnocare "one feature at a time" pattern.
 *
 *  Everything here is imperative DOM (direct style writes via
 *  querySelectorAll), not React state: the old version re-rendered nine
 *  AdvantageRow components as the pin ran across 405vh of scroll, which
 *  read as sluggish. With only `slideCount` (3) possible states and a much
 *  shorter pin, a style write only happens on the rare tick where the
 *  active slide actually changes — same approach as useVisionHighlight's
 *  word-lighting. The background image gets one cheap per-tick transform
 *  for a slow drift; nothing else runs continuously. */
export function useApproachScroll(
  spacerRef: RefObject<HTMLElement | null>,
  stickyRef: RefObject<HTMLElement | null>,
  imageRef: RefObject<HTMLElement | null>,
  slideCount: number,
) {
  const ready = useAnimationsReady();

  useEffect(() => {
    const spacer = spacerRef.current;
    const sticky = stickyRef.current;
    const image = imageRef.current;
    if (!ready || !spacer || !sticky || slideCount === 0) return;

    const slides = Array.from(sticky.querySelectorAll<HTMLElement>('.approach-slide'));
    if (slides.length === 0) return;

    let lastActive = -1;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: spacer,
        start: 'top top',
        end: 'bottom bottom',
        pin: sticky,
        scrub: true,
        onUpdate: (self) => {
          const active = Math.min(slideCount - 1, Math.floor(self.progress * slideCount));
          if (active !== lastActive) {
            lastActive = active;
            slides.forEach((slide, i) => {
              slide.style.opacity = i === active ? '1' : '0';
              slide.style.pointerEvents = i === active ? 'auto' : 'none';
            });
          }

          if (image) {
            gsap.set(image, { yPercent: -6 + self.progress * 12 });
          }
        },
      });
    });

    return () => ctx.revert();
  }, [ready, spacerRef, stickyRef, imageRef, slideCount]);
}
