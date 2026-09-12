import type { ReactNode } from 'react';

type Tone = 'accent' | 'green' | 'yellow' | 'red' | 'muted';

const TONES: Record<Tone, string> = {
  accent: 'bg-white/6 text-ink border-white/16',
  green: 'bg-status-green/10 text-status-green border-status-green/22',
  yellow: 'bg-status-yellow/10 text-status-yellow border-status-yellow/22',
  /** Added for the dashboard's fourth and fifth verdict states — the
   *  marketing site's status-panel mockup only ever needed green/yellow. */
  red: 'bg-status-red/10 text-status-red border-status-red/22',
  muted: 'bg-white/4 text-ink-dim border-line',
};

export function Badge({
  tone = 'accent',
  className = '',
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-caption font-semibold tracking-[0.06em] uppercase ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** The small white dot used inside badges and the floating CTA. */
export function GlowDot({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block size-2 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent-glow-strong),0_0_32px_var(--color-accent-glow)] ${className}`}
    />
  );
}
