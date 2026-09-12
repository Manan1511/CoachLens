import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from './StatusBadge';
import type { Athlete, DeliveryStatus } from '@/lib/api/types';
import { ageFromDob, formatDate } from '@/lib/stats';

/** A plain divided row, not a bordered card — the roster is a list, not a
 *  grid of tiles. Two fixed rows (name + status, then date + consent) so
 *  nothing crowds or overlaps at narrow widths; see DESIGN.md §7. */
export function AthleteCard({
  athlete,
  lastSessionDate,
  latestStatus,
}: {
  athlete: Athlete;
  lastSessionDate: string | null;
  latestStatus: DeliveryStatus | null;
}) {
  const age = ageFromDob(athlete.dob);
  const isMinor = age !== null && age < 18;

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
        {isMinor && (
          <Badge tone={athlete.guardian_consent ? 'accent' : 'yellow'}>
            {athlete.guardian_consent ? 'Consent on file' : 'Consent needed'}
          </Badge>
        )}
      </div>
    </Link>
  );
}
