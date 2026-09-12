import { computeSessionStats } from '@/lib/analytics';
import { VERDICT_COPY } from '@/content/verdict-copy';
import type { DeliverySummary, DeliveryStatus } from '@/lib/api/types';

const DOT_CLASS: Record<'green' | 'yellow' | 'red' | 'muted', string> = {
  green: 'bg-status-green',
  yellow: 'bg-status-yellow',
  red: 'bg-status-red',
  muted: 'bg-ink-muted',
};

/** One compact line per session — total balls, a status breakdown, and a
 *  quick "stable vs drift" read. The dots pass their status label as a
 *  native title (hover for the word), and StatusLegend spells the same
 *  colours out in text once per athlete page rather than leaving a coach
 *  to guess what a bare coloured dot means the first time they see one. */
export function SessionSummaryStats({ deliveries }: { deliveries: DeliverySummary[] }) {
  const stats = computeSessionStats(deliveries);
  const statusEntries = Object.entries(stats.byStatus) as [DeliveryStatus, number][];

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-md gap-y-1 text-caption text-ink-dim">
      <span>
        {stats.total} {stats.total === 1 ? 'delivery' : 'deliveries'}
      </span>

      <span className="flex items-center gap-2.5">
        {statusEntries.map(([status, count]) => (
          <span key={status} title={VERDICT_COPY[status].label} className="flex items-center gap-1">
            <span className={`size-1.5 rounded-full ${DOT_CLASS[VERDICT_COPY[status].tone]}`} />
            {count}
          </span>
        ))}
      </span>

      {stats.avgConfidence !== null && <span>{Math.round(stats.avgConfidence * 100)}% avg confidence</span>}

      <span
        className={stats.verdict === 'Drift detected' ? 'font-medium text-status-red' : 'text-ink-dim'}
      >
        {stats.verdict}
      </span>
    </div>
  );
}
