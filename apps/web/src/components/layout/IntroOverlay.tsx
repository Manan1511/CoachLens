import type { RefObject } from 'react';

/** "Presenting" → "CoachLens", the L drawn as an acute angle that strokes
 *  itself on. Refs are owned by useIntro in App so the timeline can gate
 *  the rest of the page. */
export function IntroOverlay({
  overlayRef,
  eyebrowRef,
  brandRef,
}: {
  overlayRef: RefObject<HTMLDivElement | null>;
  eyebrowRef: RefObject<HTMLParagraphElement | null>;
  brandRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-10000 flex items-center justify-center bg-canvas transition-[opacity,visibility] duration-600 ease-out-expo data-[hidden=true]:invisible data-[hidden=true]:pointer-events-none data-[hidden=true]:opacity-0"
    >
      {/* Both children share one grid cell so "CoachLens" cross-fades in at
          the exact centre of the screen — the same spot "Presenting"
          occupied — rather than sitting below a stacked eyebrow line. */}
      <div className="grid place-items-center px-[var(--container-padding)] text-center">
        <p
          ref={eyebrowRef}
          className="col-start-1 row-start-1 translate-y-3.5 font-heading text-intro-eyebrow font-bold tracking-[-0.01em] text-ink opacity-0"
        >
          Presenting
        </p>

        <div
          ref={brandRef}
          className="col-start-1 row-start-1 translate-y-[22px] font-heading text-intro-brand leading-none tracking-[-0.035em] whitespace-nowrap text-ink opacity-0"
        >
          <span className="font-normal">Coach</span>
          <span className="intro-angle" aria-hidden>
            <svg
              viewBox="0 0 34 64"
              fill="none"
              stroke="currentColor"
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="intro-angle-stroke" d="M7 59 L27 6" />
              <path className="intro-angle-stroke" d="M7 59 L31 59" />
            </svg>
          </span>
          <span className="font-bold">ens</span>
          <span className="visually-hidden">CoachLens</span>
        </div>
      </div>
    </div>
  );
}
