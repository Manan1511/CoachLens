import { Counter } from '@/components/ui/Counter';
import { Reveal, Stagger } from '@/components/ui/Reveal';
import {
  Dim,
  SectionIntro,
  SectionLabel,
  SectionTitle,
} from '@/components/ui/SectionHeading';
import { METRIC_TARGETS, METRICS_HEADER } from '@/content/metrics';

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

        <Stagger className="relative grid grid-cols-5 gap-md max-tablet:grid-cols-3 max-mobile:grid-cols-2">
          {METRIC_TARGETS.map((metric) => (
            <div
              key={metric.label}
              className="rounded-md border border-line bg-surface p-md text-center transition-all duration-[400ms] ease-smooth hover:-translate-y-1 hover:border-line-strong hover:shadow-glow"
            >
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
