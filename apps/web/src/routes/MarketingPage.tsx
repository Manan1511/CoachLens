import { FloatingCta } from '@/components/layout/FloatingCta';
import { Footer } from '@/components/layout/Footer';
import { Nav } from '@/components/layout/Nav';
import { Advantages } from '@/components/sections/Advantages';
import { CtaSection } from '@/components/sections/CtaSection';
import { Hero } from '@/components/sections/Hero';
import { Metrics } from '@/components/sections/Metrics';
import { Science } from '@/components/sections/Science';
import { Specs } from '@/components/sections/Specs';
import { StepsArc } from '@/components/sections/StepsArc';
import { Vision } from '@/components/sections/Vision';

/** Narrative order: brand → why → the bowler + advantages → the steps
 *  arc → what we measure → accuracy → what you need → ask. Section ids
 *  double as nav anchors. */
export function MarketingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Vision />
        <Advantages />
        <StepsArc />
        <Science />
        <Metrics />
        <Specs />
        <CtaSection />
      </main>
      <Footer />
      <FloatingCta />
    </>
  );
}
