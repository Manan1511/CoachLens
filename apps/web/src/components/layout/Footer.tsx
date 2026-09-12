import { useRef } from 'react';
import { Wordmark, WordmarkText } from '@/components/icons';
import {
  FOOTER_BOTTOM,
  FOOTER_COLUMNS,
  FOOTER_CONTACT,
} from '@/content/cta';
import { useFooterParallax } from '@/hooks/useFooterParallax';

export function Footer() {
  const giantRef = useRef<HTMLDivElement>(null);
  useFooterParallax(giantRef);

  return (
    <footer id="footer" className="border-t border-line bg-canvas pt-2xl pb-lg">
      <div className="container">
        <div
          ref={giantRef}
          aria-hidden
          className="mb-xl overflow-hidden font-heading text-giant leading-[0.9] font-semibold tracking-[-0.02em] text-ghost"
        >
          <Wordmark className="uppercase" />
        </div>

        <div className="mb-xl grid grid-cols-[1fr_1fr_1fr_2fr] gap-lg max-tablet:grid-cols-2 max-tablet:gap-md max-mobile:grid-cols-1">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <div className="mb-sm border-b border-line pb-xs text-caption font-bold tracking-[0.12em] uppercase text-ink-dim">
                {column.title}
              </div>
              {column.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block py-1 text-small text-ink-secondary transition-colors duration-200 hover:text-accent"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}

          <div>
            <div className="mb-sm border-b border-line pb-xs text-caption font-bold tracking-[0.12em] uppercase text-ink-dim">
              {FOOTER_CONTACT.title}
            </div>
            {FOOTER_CONTACT.lines.map((line) => (
              <p key={line} className="mb-1 text-small text-ink-secondary">
                {line}
              </p>
            ))}
            <p className="mt-sm">
              <a
                href={`mailto:${FOOTER_CONTACT.email}`}
                className="block py-1 text-small text-accent transition-colors duration-200 hover:text-ink-secondary"
              >
                {FOOTER_CONTACT.email}
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-md text-caption text-ink-dim max-mobile:flex-col max-mobile:gap-sm max-mobile:text-center">
          <span>
            <WordmarkText text={FOOTER_BOTTOM.copyright} />
          </span>
          {/* The non-negotiable boundary: a coaching tool, never a diagnosis. */}
          <span>
            <WordmarkText text={FOOTER_BOTTOM.disclaimer} />
          </span>
        </div>
      </div>
    </footer>
  );
}
