import { ArrowRightIcon } from '@/components/icons';
import { Reveal } from '@/components/ui/Reveal';
import { CTA_CARDS } from '@/content/cta';

export function CtaSection() {
  return (
    <section id="cta" className="bg-canvas py-2xl">
      <div className="container">
        <div className="grid grid-cols-2 gap-md max-tablet:grid-cols-1">
          {CTA_CARDS.map((card) => (
            <Reveal
              key={card.id}
              as="a"
              id={card.id}
              href={card.href}
              className="group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-lg border border-accent bg-accent p-lg py-xl text-canvas transition-all duration-[400ms] ease-smooth hover:-translate-y-1 hover:shadow-card-hover"
            >
              <h3 className="max-w-[300px] text-cta-title leading-[1.1] font-normal">
                {card.title}
              </h3>
              <div className="flex size-12 items-center justify-center self-end rounded-full border-[1.5px] border-canvas transition-all duration-[400ms] ease-smooth group-hover:bg-canvas group-hover:text-accent">
                <ArrowRightIcon className="size-6" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
