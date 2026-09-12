import { Reveal, Stagger } from '@/components/ui/Reveal';
import { Dim, SectionLabel, SectionTitle } from '@/components/ui/SectionHeading';
import { SPEC_CARDS, SPECS_HEADER } from '@/content/specs';

export function Specs() {
  return (
    <section id="specs" className="py-2xl">
      <div className="container">
        <Reveal className="mb-xl text-center">
          <SectionLabel centered>{SPECS_HEADER.label}</SectionLabel>
          <SectionTitle className="text-center">
            {SPECS_HEADER.title}
            <Dim>{SPECS_HEADER.titleAccent}</Dim>
          </SectionTitle>
        </Reveal>

        <Stagger className="grid grid-cols-3 gap-md max-tablet:grid-cols-2 max-mobile:grid-cols-1">
          {SPEC_CARDS.map(({ icon: Icon, title, value, desc }) => (
            <div
              key={title}
              className="rounded-md border border-line bg-surface px-md pt-md pb-lg transition-all duration-[400ms] ease-smooth hover:-translate-y-0.5 hover:border-line-strong hover:shadow-glow"
            >
              <div className="mb-sm flex size-10 items-center justify-center rounded-sm bg-white/7 text-accent">
                <Icon className="size-5" />
              </div>
              <h3 className="mb-xs text-h4">{title}</h3>
              <div className="mb-xs font-heading text-h3 font-bold text-accent">{value}</div>
              <p className="text-small leading-[1.6] text-ink-dim">{desc}</p>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
