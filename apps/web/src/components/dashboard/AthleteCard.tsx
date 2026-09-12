import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from './StatusBadge';
import type { Athlete, DeliveryStatus } from '@/lib/api/types';
import { ageFromDob, formatDate } from '@/lib/stats';

/** Deliberately minimal — name, an age/consent chip, last-session date, one
 *  status chip. No metrics here at all; that's what the athlete page and
 *  delivery report are for. See DESIGN.md §7 on progressive disclosure.
 *
 *  Two fixed rows rather than one crowded flex-wrap line: name + status on
 *  top, last-session date + consent chip below. A single row that tries to
 *  fit name, consent badge, and status badge together has no good outcome
 *  at narrow widths — something always ends up either overlapping or
 *  truncated to a couple of letters. */
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
      className="block rounded-md border border-line bg-surface px-md py-4 transition-colors duration-200 hover:border-line-strong hover:bg-surface-hover"
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
