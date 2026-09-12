import { useRef } from 'react';
import { Reveal, Stagger } from '@/components/ui/Reveal';
import { Dim, SectionLabel, SectionTitle } from '@/components/ui/SectionHeading';
import { ADVANTAGES, ADVANTAGES_HEADER } from '@/content/advantages';
import { useAdvantagesScroll } from '@/hooks/useAdvantagesScroll';
import type { Advantage } from '@/types';

const PIN_VH_PER_ITEM = 45;

function AdvantageRow({ advantage, lit, showGroup }: { advantage: Advantage; lit: boolean; showGroup: boolean }) {
  return (
    <div>
      {showGroup && (
        <span
          className={`mb-1 mt-3 block text-caption font-semibold tracking-[0.15em] uppercase transition-colors duration-500 ${
            lit ? 'text-accent' : 'text-ink-muted'
          }`}
        >
          {advantage.group}
        </span>
      )}
      <div
        className={`flex items-start gap-3 rounded-md border px-5 py-4 transition-all duration-500 ease-smooth ${
          lit ? 'border-line-strong bg-glass-light opacity-100' : 'border-transparent opacity-30'
        }`}
        style={{ transform: lit ? 'translateX(0)' : 'translateX(-8px)' }}
      >
        <advantage.icon
          className={`mt-0.5 size-5 shrink-0 transition-colors duration-500 ${
            lit ? 'text-accent' : 'text-ink-muted'
          }`}
        />
        <span className="text-small text-ink-secondary">{advantage.text}</span>
      </div>
    </div>
  );
}

/** Desktop/tablet: a pinned scroll where the bowler photo carries a small
 *  scroll-tied bob and the advantages light up one at a time underneath
 *  it. A 9-item pin doesn't fit a phone viewport without clipping, so
 *  mobile gets a plain static version below instead of a squeezed one. */
function PinnedAdvantages() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const revealed = useAdvantagesScroll(spacerRef, stickyRef, imageRef, ADVANTAGES.length);

  let lastGroup = '';

  return (
    <div
      ref={spacerRef}
      className="relative hidden md:block"
      style={{ height: `${ADVANTAGES.length * PIN_VH_PER_ITEM}vh` }}
    >
      <div
        ref={stickyRef}
        className="sticky top-0 grid h-screen grid-cols-2 items-center gap-2xl overflow-hidden px-[var(--container-padding)]"
      >
        <div className="relative flex items-center justify-center overflow-hidden">
          <img
            ref={imageRef}
            className="max-h-[70vh] object-contain"
            src="/images/skeletal-overlay.jpg"
            alt="Joint tracking overlaid on a bowler's delivery stride"
            loading="lazy"
          />
        </div>

        <div className="flex flex-col gap-3">
          {ADVANTAGES.map((advantage, i) => {
            const showGroup = advantage.group !== lastGroup;
            lastGroup = advantage.group;
            return (
              <AdvantageRow
                key={advantage.text}
                advantage={advantage}
                lit={i < revealed}
                showGroup={showGroup}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Mobile: the same content, revealed as a normal stagger-on-scroll list
 *  rather than pinned — a phone viewport can't fit nine pinned steps. */
function StaticAdvantages() {
  let lastGroup = '';

  return (
    <div className="container md:hidden">
      <img
        className="mb-lg max-h-[45vh] w-full object-contain"
        src="/images/skeletal-overlay.jpg"
        alt="Joint tracking overlaid on a bowler's delivery stride"
        loading="lazy"
      />
      <Stagger className="flex flex-col gap-3">
        {ADVANTAGES.map((advantage) => {
          const showGroup = advantage.group !== lastGroup;
          lastGroup = advantage.group;
          return <AdvantageRow key={advantage.text} advantage={advantage} lit showGroup={showGroup} />;
        })}
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

      <PinnedAdvantages />
      <StaticAdvantages />
    </section>
  );
}
