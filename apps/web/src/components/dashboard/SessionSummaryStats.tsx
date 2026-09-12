import { computeSessionStats } from '@/lib/analytics';
import { StatusDistributionBar } from './StatusDistributionBar';
import type { DeliverySummary } from '@/lib/api/types';

/** One compact block per session — a proportional status bar standing in
 *  for the old row of counted dots, plus total balls and a quick
 *  "stable vs drift" read below it. */
export function SessionSummaryStats({ deliveries }: { deliveries: DeliverySummary[] }) {
  const stats = computeSessionStats(deliveries);

  return (
    <div className="mb-2 flex flex-col gap-1.5">
      <StatusDistributionBar counts={stats.byStatus} compact />

      <div className="flex flex-wrap items-center gap-x-md gap-y-1 text-caption text-ink-secondary">
        <span>
          {stats.total} {stats.total === 1 ? 'delivery' : 'deliveries'}
        </span>

        {stats.avgConfidence !== null && <span>{Math.round(stats.avgConfidence * 100)}% avg confidence</span>}

        <span
          className={stats.verdict === 'Drift detected' ? 'font-medium text-status-red' : 'text-ink-secondary'}
        >
          {stats.verdict}
        </span>
      </div>
    </div>
  );
}
