import { useMemo, useRef } from 'react';
import { Wordmark } from '@/components/icons';
import { Reveal } from '@/components/ui/Reveal';
import { SectionLabel } from '@/components/ui/SectionHeading';
import { VISION } from '@/content/vision';
import { useVisionHighlight } from '@/hooks/useVisionHighlight';

export function Vision() {
  const ref = useRef<HTMLElement>(null);
  useVisionHighlight(ref);

  const words = useMemo(() => {
    const accents = VISION.accentWords.map((word) => word.toLowerCase());
    return VISION.statement.split(/\s+/).map((word) => ({
      word,
      isAccent: accents.some((accent) => word.toLowerCase().includes(accent)),
    }));
  }, []);

  return (
    <section ref={ref} id="vision" className="relative py-2xl">
      <div className="container">
        <Reveal>
          <SectionLabel>{VISION.label}</SectionLabel>
        </Reveal>

        <p className="mx-auto max-w-[1000px] text-center font-heading text-statement leading-[1.5]">
          {words.map(({ word, isAccent }, i) => (
            <span key={`${word}-${i}`}>
              <span className="vision-word" data-accent={isAccent || undefined}>
                {word.toLowerCase() === 'coachlens' ? <Wordmark /> : word}
              </span>
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
