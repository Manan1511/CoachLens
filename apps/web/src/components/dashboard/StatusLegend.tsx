import { VERDICT_COPY } from '@/content/verdict-copy';
import type { DeliveryStatus } from '@/lib/api/types';

const DOT_CLASS: Record<'green' | 'yellow' | 'red' | 'muted', string> = {
  green: 'bg-status-green',
  yellow: 'bg-status-yellow',
  red: 'bg-status-red',
  muted: 'bg-ink-muted',
};

/** A compact colour key — every chart or dot-based summary on the athlete
 *  page uses the same green/yellow/red/muted tones as the status badges,
 *  but without this, a coach has no way to learn what they mean the first
 *  time they see a bare coloured dot instead of a labelled pill. */
export function StatusLegend({ statuses }: { statuses: DeliveryStatus[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-dim">
      {statuses.map((status) => (
        <span key={status} className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${DOT_CLASS[VERDICT_COPY[status].tone]}`} />
          {VERDICT_COPY[status].label}
        </span>
      ))}
    </div>
  );
}
