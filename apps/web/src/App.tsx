import { useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { IntroOverlay } from '@/components/layout/IntroOverlay';
import { AnimationReadyProvider } from '@/lib/animation-context';
import { useIntro } from '@/hooks/useIntro';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import { DashboardPlaceholder } from '@/routes/DashboardPlaceholder';
import { MarketingPage } from '@/routes/MarketingPage';

export function App() {
  const { pathname } = useLocation();
  const isMarketing = pathname === '/';

  const overlayRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  // Smooth scroll and the intro belong to the marketing page only.
  useSmoothScroll(isMarketing);
  const introDone = useIntro({
    overlay: overlayRef,
    eyebrow: eyebrowRef,
    brand: brandRef,
  });

  return (
    <>
      {isMarketing && (
        <IntroOverlay
          overlayRef={overlayRef}
          eyebrowRef={eyebrowRef}
          brandRef={brandRef}
        />
      )}

      {/* Scroll animations stay parked until the overlay is gone. */}
      <AnimationReadyProvider ready={introDone}>
        <Routes>
          <Route path="/" element={<MarketingPage />} />
          <Route path="/app/*" element={<DashboardPlaceholder />} />
        </Routes>
      </AnimationReadyProvider>
    </>
  );
}
