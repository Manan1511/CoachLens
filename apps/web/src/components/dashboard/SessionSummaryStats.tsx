import { computeSessionStats } from '@/lib/analytics';
import { VERDICT_COPY } from '@/content/verdict-copy';
import type { DeliverySummary } from '@/lib/api/types';

/** One compact line per session — total balls, a status breakdown, and a
 *  quick "stable vs drift" read. Plain text, not another row of coloured
 *  boxes; the status dots reuse the same tone tokens as the badges without
 *  the pill chrome. */
export function SessionSummaryStats({ deliveries }: { deliveries: DeliverySummary[] }) {
  const stats = computeSessionStats(deliveries);
  const statusEntries = Object.entries(stats.byStatus) as [
    keyof typeof stats.byStatus,
    number,
  ][];

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-md gap-y-1 text-caption text-ink-dim">
      <span>
        {stats.total} {stats.total === 1 ? 'delivery' : 'deliveries'}
      </span>

      <span className="flex items-center gap-2.5">
        {statusEntries.map(([status, count]) => (
          <span key={status} className="flex items-center gap-1">
            <span
              className={`size-1.5 rounded-full ${
                VERDICT_COPY[status].tone === 'green'
                  ? 'bg-status-green'
                  : VERDICT_COPY[status].tone === 'yellow'
                    ? 'bg-status-yellow'
                    : VERDICT_COPY[status].tone === 'red'
                      ? 'bg-status-red'
                      : 'bg-ink-muted'
              }`}
            />
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
