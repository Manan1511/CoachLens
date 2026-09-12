import { HandIcon, PersonIcon } from '@/components/icons';
import type { Athlete } from '@/lib/api/types';

const GENDER_LABEL: Record<Athlete['gender'], string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

/** Gender and bowling arm, shown as quiet inline facts rather than another
 *  pair of coloured badges — this is demographic/technique context, not a
 *  status. `bowling_arm` is a real column now (RIGHT/LEFT, nullable for
 *  athletes created before the migration); `gender` is still mock-only —
 *  see the comment on Athlete in lib/api/types.ts. */
export function AthleteMeta({ gender, bowling_arm }: Pick<Athlete, 'gender' | 'bowling_arm'>) {
  return (
    <div className="flex items-center gap-md text-small text-ink-secondary">
      <span className="flex items-center gap-1.5">
        <PersonIcon className="size-4 text-ink-dim" />
        {GENDER_LABEL[gender]}
      </span>
      <span className="flex items-center gap-1.5">
        <HandIcon className="size-4 text-ink-dim" />
        {bowling_arm === 'LEFT' ? 'Left-arm' : bowling_arm === 'RIGHT' ? 'Right-arm' : 'Arm unset'}
      </span>
    </div>
  );
}
