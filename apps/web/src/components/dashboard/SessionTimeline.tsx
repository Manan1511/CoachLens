import { Link } from 'react-router';
import { FatigueChart } from './FatigueChart';
import { SessionSummaryStats } from './SessionSummaryStats';
import { StatusBadge } from './StatusBadge';
import type { SessionSummary } from '@/lib/api/types';
import { formatDate, formatDateTime } from '@/lib/stats';

/** Chronological, compact — a per-session summary line, then a date and a
 *  status chip per delivery. Nothing expands until the coach clicks into a
 *  delivery's own report page. The within-spell fatigue sparkline only
 *  renders when a session has enough trunk-tilt readings to be worth a
 *  chart (FatigueChart itself returns nothing below two points). */
export function SessionTimeline({ sessions }: { sessions: SessionSummary[] }) {
  if (sessions.length === 0) {
    return <p className="text-ink-dim">No sessions recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-md">
      {sessions.map((session) => (
        <div key={session.id}>
          <p className="mb-1 text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">
            {formatDate(session.session_date)}
          </p>

          <SessionSummaryStats deliveries={session.deliveries} />

          <FatigueChart
            points={session.deliveries.map((d) => ({
              trunkTilt: d.trunk_tilt_deg,
              status: d.latest_status,
            }))}
          />

          <div className="mt-1.5 flex flex-col gap-1.5 border-l border-line pl-md">
            {session.deliveries.length === 0 && (
              <p className="text-small text-ink-dim">No deliveries in this session.</p>
            )}
            {session.deliveries.map((delivery) => (
              <Link
                key={delivery.id}
                to={`/app/deliveries/${delivery.id}`}
                className="flex items-center justify-between gap-sm rounded-sm px-2 py-1.5 text-small transition-colors duration-200 hover:bg-white/4"
              >
                <span className="text-ink-secondary">{formatDateTime(delivery.created_at)}</span>
                <span className="flex items-center gap-2">
                  {delivery.actioned && (
                    <span className="text-caption uppercase tracking-[0.06em] text-ink-dim">
                      {delivery.actioned === 'APPROVE' ? 'Approved' : 'Dismissed'}
                    </span>
                  )}
                  {delivery.latest_status ? (
                    <StatusBadge status={delivery.latest_status} />
                  ) : (
                    <span className="text-caption text-ink-dim">Pending</span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
