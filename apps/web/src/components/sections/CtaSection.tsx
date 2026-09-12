import { Link } from 'react-router';
import { ArrowRightIcon } from '@/components/icons';
import { Reveal } from '@/components/ui/Reveal';
import { CTA_CARD } from '@/content/cta';

export function CtaSection() {
  return (
    <section id="cta" className="bg-canvas py-2xl">
      <div className="container">
        <Reveal
          as={Link}
          to={CTA_CARD.to}
          className="group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-lg border border-accent bg-accent p-lg py-xl text-canvas transition-all duration-[400ms] ease-smooth hover:-translate-y-1 hover:shadow-card-hover"
        >
          <h3 className="max-w-[480px] text-cta-title leading-[1.1] font-normal">
            {CTA_CARD.title}
          </h3>
          <div className="flex size-12 items-center justify-center self-end rounded-full border-[1.5px] border-canvas transition-all duration-[400ms] ease-smooth group-hover:bg-canvas group-hover:text-accent">
            <ArrowRightIcon className="size-6" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
