import { HandIcon } from '@/components/icons';
import type { Athlete } from '@/lib/api/types';

/** Bowling arm, shown as a quiet inline fact rather than a coloured badge —
 *  this is technique context, not a status. A real column
 *  (`bowling_arm`, RIGHT/LEFT/null), unlike the gender field this used to
 *  sit next to — that was mock-only and came out once real athlete records
 *  were live; fabricating a demographic attribute on a real person is a
 *  data-integrity problem, not a cosmetic one. */
export function AthleteMeta({ bowling_arm }: Pick<Athlete, 'bowling_arm'>) {
  return (
    <div className="flex items-center gap-1.5 text-small text-ink-secondary">
      <HandIcon className="size-4 text-ink-dim" />
      {bowling_arm === 'LEFT' ? 'Left-arm' : bowling_arm === 'RIGHT' ? 'Right-arm' : 'Arm unset'}
    </div>
  );
}
