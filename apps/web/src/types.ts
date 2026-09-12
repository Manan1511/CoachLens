import type { ComponentType, SVGProps } from 'react';

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavLink {
  /** Matches the section's DOM id — also the anchor target. */
  id: string;
  label: string;
}

export interface Feature {
  icon: IconComponent;
  text: string;
}

/** One line in the scroll-revealed advantages list. `group` is the
 *  commitment it belongs to (Measured / Compared / Coach-led) — shown as
 *  a small tag so the list keeps its structure once it's flattened. */
export interface Advantage extends Feature {
  group: string;
}

export interface Step {
  number: string;
  label: string;
  title: string;
  desc: string;
  image?: { src: string; alt: string };
}

export interface SpecRow {
  label: string;
  value: string;
}

export interface ScienceCard {
  icon: IconComponent;
  title: string;
  desc: string;
  rows: SpecRow[];
}

export interface MetricTarget {
  target: number;
  symbol?: string;
  label: string;
}

export interface SpecCard {
  icon: IconComponent;
  title: string;
  value: string;
  desc: string;
}

export interface CtaCard {
  id: string;
  title: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}
