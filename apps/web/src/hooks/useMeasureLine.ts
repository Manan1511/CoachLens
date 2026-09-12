import { useEffect, type RefObject } from 'react';
import { gsap } from '@/lib/gsap';
import { useAnimationsReady } from '@/lib/animation-context';

/** Draws a decorative curvy line across the numbered list as the section
 *  scrolls past — from "01" toward "02" — with a tiny cricket-ball marker
 *  leading the tip, as if the ball itself were travelling down the line.
 *  Purely cosmetic (the path and ball are aria-hidden), not another data
 *  visualisation.
 *
 *  The path's `pathLength={1}` prop (set in Science.tsx) normalizes the
 *  dash math to a 0–1 fraction regardless of the curve's real on-screen
 *  length, so the draw-on doesn't need to measure it. The ball is a plain
 *  HTML element, not part of the SVG (see Science.tsx for why), so its
 *  position is read straight off the path's own 0–100 viewBox coordinates
 *  via `getPointAtLength()` and applied as CSS `left`/`top` percentages —
 *  those line up exactly with where the (non-uniformly stretched) path
 *  renders, without needing the ball to live inside that same distortion. */
export function useMeasureLine(
  containerRef: RefObject<HTMLElement | null>,
  pathRef: RefObject<SVGPathElement | null>,
  ballRef: RefObject<HTMLElement | null>,
) {
  const ready = useAnimationsReady();

  useEffect(() => {
    const container = containerRef.current;
    const path = pathRef.current;
    const ball = ballRef.current;
    if (!ready || !container || !path) return;

    const totalLength = path.getTotalLength();

    const place = (progress: number) => {
      path.setAttribute('stroke-dashoffset', String(1 - progress));

      if (ball) {
        const { x, y } = path.getPointAtLength(progress * totalLength);
        ball.style.left = `${x}%`;
        ball.style.top = `${y}%`;
        ball.style.opacity = progress > 0 && progress < 1 ? '1' : '0';
      }
    };

    place(0);

    const ctx = gsap.context(() => {
      gsap.to(
        { p: 0 },
        {
          p: 1,
          ease: 'none',
          onUpdate: function () {
            place(this.targets()[0].p);
          },
          scrollTrigger: {
            trigger: container,
            // Tied to the container's own top-to-bottom (not a fixed point
            // on screen), so the ball genuinely starts at "01" and arrives
            // at "02" regardless of how tall the two rows render — a fixed
            // end point finished the run before "02" was even in view. The
            // low scrub value keeps it feeling like a quick delivery rather
            // than a crawl that exactly tracks scroll speed.
            start: 'top 70%',
            end: 'bottom 65%',
            scrub: 0.2,
          },
        },
      );
    }, container);

    return () => ctx.revert();
  }, [ready, containerRef, pathRef, ballRef]);
}
