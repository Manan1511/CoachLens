/* =============================================
   CoachLens — Main Entry Point
   Intro sequence, smooth scroll, animations, navigation
   ============================================= */

import gsap from 'gsap';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { initAnimations } from './animations.js';
import { initNavigation } from './navigation.js';

/* ── Smooth Scrolling with Lenis ── */
function initSmoothScroll() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  return lenis;
}

/* ── Intro sequence: "Introducing" → "CoachLens" ──
   Resolves once the overlay is gone, so the hero animation can follow it
   rather than playing out of sight behind it. */
function playIntro() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return Promise.resolve();

  const eyebrow = document.getElementById('intro-eyebrow');
  const brand = document.getElementById('intro-brand');
  const strokes = preloader.querySelectorAll('.intro__angle-stroke');

  const finish = () => {
    preloader.classList.add('is-hidden');
    document.body.style.overflow = '';
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !eyebrow || !brand) {
    gsap.set([eyebrow, brand], { opacity: 1, y: 0 });
    return new Promise((resolve) => {
      setTimeout(() => { finish(); resolve(); }, 600);
    });
  }

  // Hold the page still while the intro plays
  document.body.style.overflow = 'hidden';

  // Prepare the angled L so it can draw itself on
  strokes.forEach((path) => {
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  });

  return new Promise((resolve) => {
    const safety = setTimeout(() => { finish(); resolve(); }, 6000);

    const tl = gsap.timeline({
      onComplete: () => {
        clearTimeout(safety);
        finish();
        resolve();
      },
    });

    tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' })
      .to(eyebrow, { opacity: 0, y: -12, duration: 0.45, ease: 'power2.in' }, '+=0.5')
      .to(brand, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' }, '-=0.15')
      .to(strokes, { strokeDashoffset: 0, duration: 0.55, stagger: 0.12, ease: 'power2.out' }, '-=0.55')
      .to(preloader, { opacity: 0, duration: 0.7, ease: 'power2.inOut' }, '+=0.75');
  });
}

/* ── Initialize Everything ── */
document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initNavigation();

  playIntro().then(() => {
    initAnimations();
  });
});
