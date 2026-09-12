import type { FooterColumn } from '@/types';
import { CONTACT_EMAIL } from './nav';

/** The closing pitch — one card, not two, pointing straight at sign-up
 *  rather than a mailto (a coach can just create an account now). */
export const CTA_CARD = {
  title: 'Try it with your squad',
  to: '/app/login?mode=sign-up',
} as const;

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Our approach', href: '#architecture' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'What we measure', href: '#science' },
      { label: 'What you need', href: '#specs' },
    ],
  },
  {
    title: 'For coaches',
    links: [
      { label: 'Early access', href: '#cta' },
      { label: 'Field trial', href: '#cta' },
      { label: 'Accuracy targets', href: '#metrics' },
      { label: 'Why we built it', href: '#vision' },
    ],
  },
  {
    // Placeholders until Milestone 6 ships the real pages.
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: '#' },
      { label: 'Terms of service', href: '#' },
      { label: 'How we handle data', href: '#' },
      { label: 'Guardian consent', href: '#' },
    ],
  },
];

export const FOOTER_CONTACT = {
  title: 'Get in touch',
  lines: [
    'Built for grassroots cricket academies.',
    'A coaching tool, not a medical device, and not an injury predictor.',
  ],
  email: CONTACT_EMAIL,
} as const;

export const FOOTER_BOTTOM = {
  copyright: '© 2026 CoachLens',
  disclaimer: 'Pain or medical advice always overrides anything CoachLens shows you.',
} as const;
