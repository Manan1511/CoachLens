import { Counter } from '@/components/ui/Counter';
import { Reveal, Stagger } from '@/components/ui/Reveal';
import {
  Dim,
  SectionIntro,
  SectionLabel,
  SectionTitle,
} from '@/components/ui/SectionHeading';
import { METRIC_TARGETS, METRICS_HEADER } from '@/content/metrics';

/** A single contiguous stat strip — hairline dividers between numbers
 *  instead of five separate bordered cards, closer to a spec sheet than a
 *  grid of tiles. Matches DESIGN.md's own rule that elevation here is a
 *  hairline, never a card of its own. */
export function Metrics() {
  return (
    <section
      id="metrics"
      className="metrics-glow relative overflow-hidden bg-canvas py-2xl"
    >
      <div className="container">
        <Reveal className="relative mb-xl text-center">
          <SectionLabel centered>{METRICS_HEADER.label}</SectionLabel>
          <SectionTitle>
            {METRICS_HEADER.title}
            <Dim>{METRICS_HEADER.titleAccent}</Dim>
          </SectionTitle>
          <SectionIntro>{METRICS_HEADER.intro}</SectionIntro>
        </Reveal>

        <Stagger className="relative flex flex-col divide-y divide-line border-y border-line max-tablet:border-x-0 md:flex-row md:divide-x md:divide-y-0">
          {METRIC_TARGETS.map((metric) => (
            <div key={metric.label} className="flex-1 px-md py-xl text-center">
              <div className="mb-xs font-heading text-metric leading-none text-ink">
                <Counter target={metric.target} symbol={metric.symbol} />
              </div>
              <div className="mx-auto max-w-[200px] text-small text-ink-secondary">
                {metric.label}
              </div>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
