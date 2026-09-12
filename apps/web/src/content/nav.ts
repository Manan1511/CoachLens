import type { NavLink } from '@/types';

/** The single source for the desktop nav, the mobile menu, and
 *  active-section tracking. Previously duplicated in three places, which
 *  is how the mobile menu silently lost "Accuracy". */
export const NAV_LINKS: NavLink[] = [
  { id: 'vision', label: 'Why' },
  { id: 'architecture', label: 'Approach' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'science', label: 'What we measure' },
  { id: 'metrics', label: 'Accuracy' },
  { id: 'specs', label: 'What you need' },
];

export const CONTACT_EMAIL = 'hello@coachlens.dev';
