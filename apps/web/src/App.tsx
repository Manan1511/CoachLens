import { useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { IntroOverlay } from '@/components/layout/IntroOverlay';
import { AnimationReadyProvider } from '@/lib/animation-context';
import { CoachAuthProvider } from '@/lib/auth/coach-auth';
import { useIntro } from '@/hooks/useIntro';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import { AthleteDetailPage } from '@/routes/dashboard/AthleteDetailPage';
import { DashboardLayout } from '@/routes/dashboard/DashboardLayout';
import { DeliveryReportPage } from '@/routes/dashboard/DeliveryReportPage';
import { LoginPage } from '@/routes/dashboard/LoginPage';
import { RosterPage } from '@/routes/dashboard/RosterPage';
import { MarketingPage } from '@/routes/MarketingPage';

export function App() {
  const { pathname } = useLocation();
  const isMarketing = pathname === '/';

  const overlayRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  // Smooth scroll and the intro belong to the marketing page only — the
  // dashboard is a standard nav+content app, not a scroll narrative. See
  // DESIGN.md §7.
  useSmoothScroll(isMarketing);
  const introDone = useIntro({
    overlay: overlayRef,
    eyebrow: eyebrowRef,
    brand: brandRef,
  });

  return (
    <CoachAuthProvider>
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

          <Route path="/app/login" element={<LoginPage />} />
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<RosterPage />} />
            <Route path="athletes/:athleteId" element={<AthleteDetailPage />} />
            <Route path="deliveries/:deliveryId" element={<DeliveryReportPage />} />
          </Route>
        </Routes>
      </AnimationReadyProvider>
    </CoachAuthProvider>
  );
}
