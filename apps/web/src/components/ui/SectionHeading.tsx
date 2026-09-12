import type { ReactNode } from 'react';

/** Eyebrow label. Bold and small — the counterweight to the light headings. */
export function SectionLabel({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <div
      className={`mb-md inline-flex items-center gap-3 ${centered ? 'justify-center' : ''}`}
    >
      <span className="h-px w-10 bg-line-strong" />
      <span className="font-body text-caption font-bold tracking-[0.12em] uppercase text-ink">
        {children}
      </span>
      {centered && <span className="h-px w-10 bg-line-strong" />}
    </div>
  );
}

/** Section h2. Weight 400 with dimmed emphasis — never a colour accent. */
export function SectionTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h2 className={`mt-sm text-h1 ${className}`}>{children}</h2>;
}

export function SectionIntro({ children }: { children: ReactNode }) {
  return (
    <p className="mx-auto mt-sm max-w-[620px] text-ink-secondary">{children}</p>
  );
}

/** Two-tone emphasis: the "accent" dims rather than colours. */
export function Dim({ children }: { children: ReactNode }) {
  return <span className="text-ink-dim">{children}</span>;
}
