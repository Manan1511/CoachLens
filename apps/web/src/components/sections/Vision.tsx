import { useMemo, useRef } from 'react';
import { Wordmark } from '@/components/icons';
import { Reveal } from '@/components/ui/Reveal';
import { SectionLabel } from '@/components/ui/SectionHeading';
import { VISION } from '@/content/vision';
import { useVisionHighlight } from '@/hooks/useVisionHighlight';

export function Vision() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  useVisionHighlight(spacerRef, stickyRef);

  const words = useMemo(() => {
    const accents = VISION.accentWords.map((word) => word.toLowerCase());
    return VISION.statement.split(/\s+/).map((word) => ({
      word,
      isAccent: accents.some((accent) => word.toLowerCase().includes(accent)),
    }));
  }, []);

  return (
    <section id="vision" className="relative">
      <div className="container pt-2xl">
        <Reveal>
          <SectionLabel>{VISION.label}</SectionLabel>
        </Reveal>
      </div>

      {/* A dedicated span of empty scroll distance to pin against — the
          page holds still (via `pin` in useVisionHighlight) for this whole
          height, only releasing back into normal scroll once the sentence
          has finished lighting up and held for a beat. */}
      <div ref={spacerRef} className="relative h-[220vh]">
        <div ref={stickyRef} className="sticky top-0 flex min-h-screen items-center py-2xl">
          <div className="container">
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
        </div>
      </div>
    </section>
  );
}
