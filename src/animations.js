/* =============================================
   CoachLens — GSAP Scroll Animations
   Ethnocare-inspired scroll-driven interactions
   ============================================= */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initAnimations() {
  initHeroAnimations();
  initRevealAnimations();
  initVisionHighlight();
  initArchitectureLayers();
  initCounterAnimations();
  initFloatingCTA();
  initFooterGiant();
}

/* ── Hero Entry Animation ── */
function initHeroAnimations() {
  const tl = gsap.timeline({ delay: 0.15 });

  // Animate title words
  tl.to('.hero__title-word', {
    y: 0,
    opacity: 1,
    duration: 1,
    stagger: 0.15,
    ease: 'expo.out',
  })
  .from('.hero__subtitle', {
    y: 30,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
  }, '-=0.4')
  .from('.hero__actions', {
    y: 20,
    opacity: 0,
    duration: 0.6,
    ease: 'power3.out',
  }, '-=0.4')
  .from('.hero__badge', {
    y: -10,
    opacity: 0,
    duration: 0.5,
    ease: 'power3.out',
  }, '-=0.6')
  .from('.hero__scroll-indicator', {
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
  }, '-=0.3');

  // Subtle parallax inside the framed hero image
  gsap.fromTo(
    '.hero__bg img',
    { scale: 1.12, yPercent: -4 },
    {
      yPercent: 4,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    }
  );
}

/* ── Generic Reveal Animations ── */
function initRevealAnimations() {
  const reveals = document.querySelectorAll('.reveal');

  reveals.forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      onEnter: () => el.classList.add('is-visible'),
    });
  });

  // Stagger children
  const staggerGroups = document.querySelectorAll('.stagger-children');
  staggerGroups.forEach((group) => {
    ScrollTrigger.create({
      trigger: group,
      start: 'top 80%',
      onEnter: () => group.classList.add('is-visible'),
    });
  });
}

/* ── Vision Text Highlight on Scroll ── */
function initVisionHighlight() {
  const statement = document.getElementById('vision-statement');
  if (!statement) return;

  const text = statement.textContent.trim();
  statement.textContent = '';

  // Wrap each word in a span
  const words = text.split(/\s+/);
  const accentWords = ['CoachLens', 'consistent', 'numbers', 'grassroots', 'already'];

  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'vision__word';
    span.textContent = word;
    if (accentWords.some(aw => word.toLowerCase().includes(aw.toLowerCase()))) {
      span.dataset.accent = 'true';
    }
    statement.appendChild(span);
    if (i < words.length - 1) {
      statement.appendChild(document.createTextNode(' '));
    }
  });

  const wordSpans = statement.querySelectorAll('.vision__word');

  // Animate words on scroll
  ScrollTrigger.create({
    trigger: '.vision',
    start: 'top 70%',
    end: 'bottom 40%',
    onUpdate: (self) => {
      const progress = self.progress;
      const totalWords = wordSpans.length;
      const activeIndex = Math.floor(progress * totalWords * 1.3);

      wordSpans.forEach((span, i) => {
        if (i <= activeIndex) {
          span.classList.add('is-highlighted');
          if (span.dataset.accent === 'true') {
            span.classList.add('is-accent');
          }
        } else {
          span.classList.remove('is-highlighted');
          span.classList.remove('is-accent');
        }
      });
    },
    scrub: true,
  });
}

/* ── Architecture Layers Pinned Scroll ── */
function initArchitectureLayers() {
  const layers = [
    document.getElementById('arch-layer-1'),
    document.getElementById('arch-layer-2'),
    document.getElementById('arch-layer-3'),
  ];

  if (!layers[0]) return;

  const pinSpacer = document.getElementById('arch-pin-spacer');

  ScrollTrigger.create({
    trigger: pinSpacer,
    start: 'top top',
    end: 'bottom bottom',
    pin: document.getElementById('arch-sticky'),
    scrub: true,
    onUpdate: (self) => {
      const progress = self.progress;

      if (progress < 0.33) {
        setActiveLayer(0);
      } else if (progress < 0.66) {
        setActiveLayer(1);
      } else {
        setActiveLayer(2);
      }
    },
  });

  function setActiveLayer(index) {
    layers.forEach((layer, i) => {
      if (i === index) {
        if (!layer.classList.contains('is-active')) {
          layer.classList.add('is-active');
          // Animate in
          gsap.fromTo(layer, { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' });
        }
      } else {
        layer.classList.remove('is-active');
      }
    });
  }
}

/* ── Counter Animations ── */
function initCounterAnimations() {
  const counters = document.querySelectorAll('.counter');

  counters.forEach((counter) => {
    const target = parseFloat(counter.dataset.target);
    const isDecimal = target % 1 !== 0;

    ScrollTrigger.create({
      trigger: counter,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          duration: 2,
          ease: 'power2.out',
          onUpdate: function () {
            const progress = this.progress();
            const current = target * progress;
            counter.textContent = isDecimal ? current.toFixed(1) : Math.round(current);
          },
        });
      },
    });
  });
}

/* ── Floating CTA ── */
function initFloatingCTA() {
  const floatingCTA = document.getElementById('floating-cta');
  if (!floatingCTA) return;

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'bottom top',
    onEnter: () => floatingCTA.classList.add('is-visible'),
    onLeaveBack: () => floatingCTA.classList.remove('is-visible'),
  });

  // Hide near footer
  ScrollTrigger.create({
    trigger: '.cta-section',
    start: 'top 80%',
    onEnter: () => floatingCTA.classList.remove('is-visible'),
    onLeaveBack: () => floatingCTA.classList.add('is-visible'),
  });
}

/* ── Footer Giant Text ── */
function initFooterGiant() {
  const giantText = document.getElementById('footer-giant');
  if (!giantText) return;

  gsap.from(giantText, {
    xPercent: -20,
    opacity: 0.3,
    scrollTrigger: {
      trigger: giantText,
      start: 'top 90%',
      end: 'top 30%',
      scrub: true,
    },
  });
}
