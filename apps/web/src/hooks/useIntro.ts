import { useLayoutEffect, useState, type RefObject } from 'react';
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
 *  screen. Returns `done`, which gates every scroll animation on the page.
 *
 *  `shouldPlay` is fixed at the app's *first* route, not the live one — the
 *  overlay itself is always mounted (see App.tsx) so a coach bouncing
 *  between the dashboard and "/" later never finds it stuck mid-animation
 *  or reset to its opaque starting state; it only ever plays once, and only
 *  when the visitor's actual entry point was the marketing page. Landing
 *  straight on the dashboard skips it outright rather than flashing a
 *  marketing intro over a login screen. Uses a layout effect so that skip
 *  (or, without it, the animation's very first frame) is applied before the
 *  browser paints — a plain effect would let one opaque frame flash first. */
export function useIntro({ overlay, eyebrow, brand }: IntroRefs, shouldPlay: boolean) {
  const [done, setDone] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
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

    if (!shouldPlay) {
      finish();
      return;
    }

    if (!overlayEl || !eyebrowEl || !brandEl || reducedMotion) {
      gsap.set([eyebrowEl, brandEl].filter(Boolean), { opacity: 1, y: 0 });
      const skip = setTimeout(finish, 600);
      return () => clearTimeout(skip);
    }

    getLenis()?.stop();
    document.body.style.overflow = 'hidden';

    const strokes = overlayEl.querySelectorAll<SVGPathElement>('.intro-angle-stroke');
    strokes.forEach((path) => {
      // Both dasharray AND dashoffset padded by the same amount, not just
      // dashoffset (that was the actual bug in the previous attempt at this
      // fix: padding only one of the two shifts the dash pattern's phase
      // out of alignment with the path, which is what put a stray visible
      // sliver at *both* ends instead of neither). getTotalLength() can be
      // a hair short of what the browser actually rasterizes; a pattern
      // built from that slightly-too-short length leaves part of the real
      // stroke uncovered by the "hidden" segment. Padding both values
      // equally keeps the on/off phase correct while making the hidden
      // segment comfortably longer than the real path, so no imprecision
      // in the measurement can leave any part of it visible before the
      // reveal starts.
      const len = path.getTotalLength() + 4;
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    });

    const safety = setTimeout(finish, 6000);

    // How much bigger the hero's wordmark renders than this one, at
    // whatever the current viewport happens to be — both sizes are
    // clamp()s that scale differently with viewport width, so a fixed
    // ratio would drift at some widths. A throwaway probe element reads
    // the real computed value instead of hard-coding one.
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;font-size:var(--text-giant);';
    document.body.appendChild(probe);
    const growScale =
      parseFloat(getComputedStyle(probe).fontSize) / parseFloat(getComputedStyle(brandEl).fontSize);
    probe.remove();

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
      // Grows in place to the hero wordmark's own size while the overlay
      // fades away around it — by the time the overlay is gone, this text
      // is already sitting at the same size/position as the (static, never
      // separately animated) hero wordmark underneath, so it reads as one
      // continuous piece of text arriving, not two different ones.
      //
      // The grow finishes *before* the fade does (0.6s inside a 0.95s
      // fade), not at the same instant — decelerating into its final size
      // with power2.out so it reads as settling rather than snapping still
      // mid-motion. That gap matters: with both ending together, the last
      // sliver of the fade was dissolving a still-moving element, which is
      // what read as a jump/pop right at the handoff to the static hero
      // text underneath. Finishing the grow early means nothing is moving
      // by the time enough of the overlay has cleared to notice — the rest
      // of the fade is a plain, smooth dissolve onto an already-settled
      // image.
      .to(brandEl, { scale: growScale, duration: 0.6, ease: 'power2.out' }, '+=0.7')
      .to(overlayEl, { opacity: 0, duration: 0.95, ease: 'sine.inOut' }, '<');

    return () => {
      clearTimeout(safety);
      tl.kill();
    };
  }, [overlay, eyebrow, brand, reducedMotion, shouldPlay]);

  return done;
}
