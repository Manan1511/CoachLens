import { VERDICT_COPY } from '@/content/verdict-copy';
import type { DeliveryStatus } from '@/lib/api/types';

const BAR_CLASS: Record<'green' | 'yellow' | 'red' | 'muted', string> = {
  green: 'bg-status-green',
  yellow: 'bg-status-yellow',
  red: 'bg-status-red',
  muted: 'bg-ink-muted',
};

/** Reading order is deliberate: on-baseline, then the two flagged states in
 *  ascending severity, then the two "nothing to compare yet" states — so the
 *  bar reads left-to-right as "good → needs attention → unscored", not
 *  alphabetically or by raw count. */
const STATUS_ORDER: DeliveryStatus[] = [
  'FORM_BENCHMARK',
  'MECHANICAL_WATCH',
  'TECHNICAL_CONCERN',
  'BENCHMARK_PENDING',
  'DATA_SUPPRESSED',
];

/** A single stacked bar standing in for a whole status breakdown — one
 *  shape a coach can read at a glance instead of a row of numbers. Segment
 *  widths are proportional to share of total; a status with zero count
 *  contributes no segment at all rather than a zero-width sliver. */
export function StatusDistributionBar({
  counts,
  compact = false,
}: {
  counts: Partial<Record<DeliveryStatus, number>>;
  compact?: boolean;
}) {
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const present = STATUS_ORDER.filter((status) => (counts[status] ?? 0) > 0);

  if (total === 0) {
    return <div className={`${compact ? 'h-1.5' : 'h-2'} rounded-full bg-white/6`} />;
  }

  return (
    <div className={compact ? '' : 'flex flex-col gap-1.5'}>
      <div className={`flex overflow-hidden rounded-full ${compact ? 'h-1.5' : 'h-2'}`}>
        {present.map((status) => {
          const count = counts[status] ?? 0;
          const copy = VERDICT_COPY[status];
          return (
            <div
              key={status}
              className={`${BAR_CLASS[copy.tone]} first:rounded-l-full last:rounded-r-full transition-all duration-500 ease-out`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${copy.label}: ${count}`}
            />
          );
        })}
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-ink-secondary">
          {present.map((status) => (
            <span key={status} className="flex items-center gap-1">
              <span className={`size-1.5 rounded-full ${BAR_CLASS[VERDICT_COPY[status].tone]}`} />
              {VERDICT_COPY[status].label} · {counts[status]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
