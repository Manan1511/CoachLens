import type { CtaCard, FooterColumn } from '@/types';
import { CONTACT_EMAIL } from './nav';

/** Milestone 6 replaces these mailto links with a real capture form
 *  once there's an endpoint to post to. */
export const CTA_CARDS: CtaCard[] = [
  {
    id: 'cta-access',
    title: 'Try it with your squad',
    href: `mailto:${CONTACT_EMAIL}?subject=CoachLens%20early%20access`,
  },
  {
    id: 'cta-prd',
    title: 'Join the field trial',
    href: `mailto:${CONTACT_EMAIL}?subject=CoachLens%20field%20trial`,
  },
];

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
    'A coaching tool — not a medical device, and not an injury predictor.',
  ],
  email: CONTACT_EMAIL,
} as const;

export const FOOTER_BOTTOM = {
  copyright: '© 2026 CoachLens',
  disclaimer: 'Pain or medical advice always overrides anything CoachLens shows you.',
} as const;
