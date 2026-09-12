import type Lenis from 'lenis';

/* The Lenis instance is a page-level singleton. Nav anchor scrolling and
   the intro scroll-lock both need it, and neither sits under the hook
   that creates it. */
let instance: Lenis | null = null;

export function setLenis(next: Lenis | null) {
  instance = next;
}

export function getLenis(): Lenis | null {
  return instance;
}

/** Scroll to a section id, clearing the fixed nav. */
export function scrollToSection(id: string, offset = 0) {
  const target = document.getElementById(id);
  if (!target) return;

  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(target, { offset: -offset });
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}
