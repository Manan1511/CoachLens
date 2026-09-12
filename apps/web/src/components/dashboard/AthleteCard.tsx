import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from './StatusBadge';
import { StatusDistributionBar } from './StatusDistributionBar';
import type { Athlete, DeliveryStatus } from '@/lib/api/types';
import { formatDate } from '@/lib/stats';

/** A plain divided row, not a bordered card — the roster is a list, not a
 *  grid of tiles. Two fixed rows (name + status, then date + consent) so
 *  nothing crowds or overlaps at narrow widths; see DESIGN.md §7.
 *
 *  The consent badge only appears when `consent_blocked` is true — the real
 *  GET /api/v1/athletes response computes that server-side and deliberately
 *  omits `dob` entirely (its own docstring: the capture app needs to know
 *  whether an athlete can be recorded, not their birthday), so there's no
 *  age to derive a "consent on file, all clear" badge from anymore either —
 *  which is fine, a badge that only shows up when there's a problem is the
 *  more useful signal anyway. */
export function AthleteCard({
  athlete,
  lastSessionDate,
  latestStatus,
  statusCounts,
}: {
  athlete: Athlete;
  lastSessionDate: string | null;
  latestStatus: DeliveryStatus | null;
  /** Full-history status breakdown, not just the latest ball — the badge
   *  above already answers "what just happened"; this bar answers "what's
   *  this athlete's pattern been overall". */
  statusCounts: Partial<Record<DeliveryStatus, number>>;
}) {
  const hasHistory = Object.keys(statusCounts).length > 0;

  return (
    <Link
      to={`/app/athletes/${athlete.id}`}
      className="-mx-3 block border-b border-line px-3 py-4 transition-all duration-200 ease-smooth first:pt-0 last:border-b-0 hover:bg-white/4 hover:translate-x-1"
    >
      <div className="mb-1 flex items-center justify-between gap-sm">
        <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
          {athlete.name}
        </span>
        {latestStatus && (
          <div className="shrink-0">
            <StatusBadge status={latestStatus} />
          </div>
        )}
      </div>

      <div className="mb-2 flex items-center justify-between gap-sm">
        <p className="text-small text-ink-secondary">
          {lastSessionDate ? `Last session ${formatDate(lastSessionDate)}` : 'No sessions yet'}
        </p>
        {athlete.consent_blocked && <Badge tone="yellow">Consent needed</Badge>}
      </div>

      {hasHistory && <StatusDistributionBar counts={statusCounts} compact />}
    </Link>
  );
}
