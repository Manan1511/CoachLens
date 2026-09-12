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

/** An editorial, numbered list rather than a pair of bordered cards — a
 *  large ghost numeral per row, one hairline rule between the two
 *  measurements, and the key facts read as a plain inline line instead of
 *  little pill backgrounds. DESIGN.md's elevation rule is a hairline, never
 *  a fill, so this leans on rules and whitespace instead of boxes. */
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

        <div className="mb-xl flex flex-col divide-y divide-line border-y border-line">
          {SCIENCE_CARDS.map(({ icon: Icon, title, desc, rows }, i) => (
            <Reveal
              key={title}
              className="grid grid-cols-[4.5rem_1fr] gap-lg py-xl max-mobile:grid-cols-1 max-mobile:gap-sm"
            >
              <span className="font-heading text-h1 font-bold text-ink-muted">
                0{i + 1}
              </span>

              <div>
                <div className="mb-sm flex items-center gap-3">
                  <Icon className="size-6 shrink-0 text-accent" />
                  <h3 className="text-h3">{title}</h3>
                </div>
                <p className="mb-md max-w-[600px] leading-[1.8] text-ink-secondary">{desc}</p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-small">
                  {rows.map((row, j) => (
                    <span key={row.label} className="flex items-center gap-1.5">
                      {j > 0 && <span className="text-ink-muted">/</span>}
                      <span className="text-ink-dim">{row.label}</span>
                      <span className="font-heading font-semibold text-ink">{row.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* The worked example: what was seen, what it might mean, coach decides.
            A left accent rule stands in for a card border — distinct enough to
            read as a callout without becoming another floating box. */}
        <Reveal className="relative mx-auto max-w-[800px] border-l-2 border-accent py-1 pl-lg">
          <div className="mb-md flex items-center gap-2.5">
            <InfoIcon className="size-[18px] shrink-0 text-accent" />
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
