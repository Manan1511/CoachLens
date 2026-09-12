import { Badge } from '@/components/ui/Badge';
import { InfoIcon } from '@/components/icons';
import { Reveal } from '@/components/ui/Reveal';
import {
  Dim,
  SectionIntro,
  SectionLabel,
  SectionTitle,
} from '@/components/ui/SectionHeading';
import { SCIENCE_CARDS, SCIENCE_HEADER, TRANSPARENCY } from '@/content/science';

export function Science() {
  return (
    <section id="science" className="bg-canvas py-2xl">
      <div className="container">
        <Reveal className="mb-xl text-center">
          <SectionLabel centered>{SCIENCE_HEADER.label}</SectionLabel>
          <SectionTitle className="text-center">
            {SCIENCE_HEADER.title}
            <Dim>{SCIENCE_HEADER.titleAccent}</Dim>
          </SectionTitle>
          <SectionIntro>{SCIENCE_HEADER.intro}</SectionIntro>
        </Reveal>

        <div className="mb-xl grid grid-cols-2 gap-lg max-tablet:grid-cols-1">
          {SCIENCE_CARDS.map(({ icon: Icon, title, desc, rows }) => (
            <Reveal
              key={title}
              className="science-card relative overflow-hidden rounded-lg border border-line bg-surface p-lg"
            >
              <div className="mb-md flex size-12 items-center justify-center rounded-md bg-white/7 text-accent">
                <Icon className="size-6" />
              </div>
              <h3 className="mb-sm text-h3">{title}</h3>
              <p className="mb-md leading-[1.8] text-ink-secondary">{desc}</p>

              <div className="flex flex-col gap-2">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-sm bg-glass-light px-3 py-2 text-small"
                  >
                    <span className="text-ink-dim">{row.label}</span>
                    <span className="font-heading font-semibold text-ink">{row.value}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>

        {/* The worked example: what was seen, what it might mean, coach decides. */}
        <Reveal className="transparency-card relative mx-auto max-w-[800px] overflow-hidden rounded-lg border border-line-strong bg-surface p-lg">
          <div className="mb-md flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-white/9 text-accent">
              <InfoIcon className="size-[18px]" />
            </div>
            <h3 className="text-h4">{TRANSPARENCY.title}</h3>
            <Badge tone="yellow" className="ml-auto">
              {TRANSPARENCY.badge}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-md max-mobile:grid-cols-1">
            {TRANSPARENCY.columns.map((col) => (
              <div key={col.heading}>
                <h4 className="mb-xs text-small tracking-[0.05em] uppercase text-accent">
                  {col.heading}
                </h4>
                <p className="text-small leading-[1.7] text-ink-secondary">{col.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-md flex flex-wrap gap-xs">
            {TRANSPARENCY.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`rounded-full border px-4 py-1.5 text-caption font-semibold transition-all duration-200 ${
                  action.primary
                    ? 'border-accent bg-accent text-canvas'
                    : 'border-line text-ink-secondary hover:border-accent hover:text-accent'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
