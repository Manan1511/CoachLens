import { useRef } from 'react';
import { Reveal, Stagger } from '@/components/ui/Reveal';
import { Dim, SectionLabel, SectionTitle } from '@/components/ui/SectionHeading';
import { ADVANTAGES, ADVANTAGES_HEADER } from '@/content/advantages';
import { useApproachScroll } from '@/hooks/useApproachScroll';
import { PoseRunningSkeleton } from '@/components/ui/PoseRunningSkeleton';
import type { Advantage } from '@/types';

const SLIDE_VH = 60;

/** Regroups the flattened list back into its three original pillars
 *  (Measured / Compared / Coach-led) — one pinned slide per group. */
function groupAdvantages(items: Advantage[]): { group: string; items: Advantage[] }[] {
  const groups: { group: string; items: Advantage[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else groups.push({ group: item.group, items: [item] });
  }
  return groups;
}

const GROUPS = groupAdvantages(ADVANTAGES);

/** Desktop/tablet: a short pin (3 slides × 60vh, not 9 items × 45vh) that
 *  swaps a full text panel per pillar against a persistent, slowly
 *  drifting bowler image — the ethnocare "one feature at a time" pattern,
 *  rebuilt to actually stay light: see useApproachScroll for why. */
function PinnedApproach() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  useApproachScroll(spacerRef, stickyRef, imageRef, GROUPS.length);

  return (
    <div
      ref={spacerRef}
      className="relative hidden md:block"
      style={{ height: `${GROUPS.length * SLIDE_VH}vh` }}
    >
      <div
        ref={stickyRef}
        className="sticky top-0 grid h-screen grid-cols-2 items-center gap-2xl overflow-hidden px-[var(--container-padding)]"
      >
        <div className="relative">
          {GROUPS.map(({ group, items }, i) => (
            <div
              key={group}
              className="approach-slide absolute inset-0 transition-opacity duration-500 ease-smooth"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              <span className="mb-md block text-caption font-semibold tracking-[0.15em] uppercase text-accent">
                {group}
              </span>
              <div className="flex flex-col gap-4">
                {items.map((advantage) => (
                  <div key={advantage.text} className="flex items-start gap-3">
                    <advantage.icon className="mt-0.5 size-5 shrink-0 text-accent" />
                    <span className="text-small leading-[1.5] text-ink-secondary max-w-[26rem]">
                      {advantage.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Reserves the tallest slide's height so the grid row doesn't
              collapse — every .approach-slide above sits on top of this,
              absolutely-positioned via the shared grid cell. */}
          <div className="invisible flex flex-col gap-4" aria-hidden>
            {GROUPS[0].items.map((advantage) => (
              <div key={advantage.text} className="flex items-start gap-3">
                <advantage.icon className="mt-0.5 size-5 shrink-0" />
                <span className="text-small leading-[1.5] max-w-[26rem]">{advantage.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div ref={imageRef} className="relative flex items-center justify-center overflow-hidden">
          <PoseRunningSkeleton className="w-full max-w-[360px]" />
        </div>
      </div>
    </div>
  );
}

/** Mobile: the same content, revealed as a normal stagger-on-scroll list
 *  rather than pinned — a phone viewport can't fit a two-column pin. */
function StaticApproach() {
  return (
    <div className="container md:hidden">
      <div className="mb-lg flex justify-center">
        <PoseRunningSkeleton className="w-full max-w-[340px]" />
      </div>
      <Stagger className="flex flex-col gap-lg">
        {GROUPS.map(({ group, items }) => (
          <div key={group}>
            <span className="mb-md block text-caption font-semibold tracking-[0.15em] uppercase text-accent">
              {group}
            </span>
            <div className="flex flex-col gap-4">
              {items.map((advantage) => (
                <div key={advantage.text} className="flex items-start gap-3">
                  <advantage.icon className="mt-0.5 size-5 shrink-0 text-accent" />
                  <span className="text-small leading-[1.5] text-ink-secondary">{advantage.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Stagger>
    </div>
  );
}

export function Advantages() {
  return (
    <section id="architecture" className="relative py-xl">
      <div className="container">
        <Reveal className="mb-lg text-center">
          <SectionLabel centered>{ADVANTAGES_HEADER.label}</SectionLabel>
          <SectionTitle className="text-center">
            {ADVANTAGES_HEADER.title}
            <Dim>{ADVANTAGES_HEADER.titleAccent}</Dim>
          </SectionTitle>
        </Reveal>
      </div>

      <PinnedApproach />
      <StaticApproach />
    </section>
  );
}
