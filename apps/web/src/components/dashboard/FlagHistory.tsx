import { Link } from 'react-router';
import { DeltaGauge } from './DeltaGauge';
import { StatusBadge } from './StatusBadge';
import type { SessionSummary } from '@/lib/api/types';
import { formatDateTime, formatDeg } from '@/lib/stats';

const ACTION_LABEL: Record<'APPROVE' | 'DISMISS', string> = {
  APPROVE: 'Approved drill',
  DISMISS: 'Dismissed',
};

/** Every flagged delivery (MECHANICAL_WATCH or TECHNICAL_CONCERN) for this
 *  athlete, with what the coach did about it — the accountability log.
 *  Date/metric/delta come from the real history shape; the action and any
 *  dismissal note are mock-only, same gap as everywhere else a coach
 *  decision needs reading back (see DeliverySummary in lib/api/types.ts).
 *
 *  `uncertaintyBand` is the same athlete-level front-knee band used by the
 *  trend chart and session timeline — null until a baseline is confirmed. */
export function FlagHistory({
  sessions,
  uncertaintyBand,
}: {
  sessions: SessionSummary[];
  uncertaintyBand: number | null;
}) {
  const flags = sessions
    .flatMap((session) => session.deliveries)
    .filter((d) => d.latest_status === 'MECHANICAL_WATCH' || d.latest_status === 'TECHNICAL_CONCERN')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (flags.length === 0) {
    return <p className="text-small text-ink-secondary">No flagged deliveries yet.</p>;
  }

  return (
    <div className="flex flex-col">
      {flags.map((flag) => (
        <Link
          key={flag.id}
          to={`/app/deliveries/${flag.id}`}
          className="-mx-3 flex items-center justify-between gap-sm border-b border-line px-3 py-3 text-small transition-colors duration-200 last:border-b-0 hover:bg-white/3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-ink-secondary">{formatDateTime(flag.created_at)}</p>
            <p className="text-caption text-ink-secondary">
              Front knee angle · Δ{flag.delta_deg !== null ? formatDeg(flag.delta_deg) : '—'}
              {flag.actioned && ` · ${ACTION_LABEL[flag.actioned]}`}
              {flag.action_note && ` — "${flag.action_note}"`}
            </p>
          </div>

          {flag.delta_deg !== null && uncertaintyBand !== null && (
            <div className="w-24 shrink-0">
              <DeltaGauge delta={flag.delta_deg} band={uncertaintyBand} showValue={false} />
            </div>
          )}

          {flag.latest_status && (
            <div className="shrink-0">
              <StatusBadge status={flag.latest_status} />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
