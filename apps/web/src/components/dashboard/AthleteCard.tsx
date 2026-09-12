import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from './StatusBadge';
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
}: {
  athlete: Athlete;
  lastSessionDate: string | null;
  latestStatus: DeliveryStatus | null;
}) {
  return (
    <Link
      to={`/app/athletes/${athlete.id}`}
      className="-mx-3 block border-b border-line px-3 py-4 transition-colors duration-200 first:pt-0 last:border-b-0 hover:bg-white/3"
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

      <div className="flex items-center justify-between gap-sm">
        <p className="text-small text-ink-dim">
          {lastSessionDate ? `Last session ${formatDate(lastSessionDate)}` : 'No sessions yet'}
        </p>
        {athlete.consent_blocked && <Badge tone="yellow">Consent needed</Badge>}
      </div>
    </Link>
  );
}
