import {
  BarsIcon,
  BookIcon,
  CheckCircleIcon,
  EyeIcon,
  InfoIcon,
  LockIcon,
  PhoneIcon,
  PulseIcon,
  UserPlusIcon,
} from '@/components/icons';
import type { Advantage } from '@/types';

export const ADVANTAGES_HEADER = {
  label: 'Our approach',
  title: 'Three commitments we ',
  titleAccent: 'build around',
} as const;

/** Flattened from the old three-pillar pitch (Measured / Compared /
 *  Coach-led) into one ordered list that reveals as the visitor scrolls
 *  past the bowler, one line at a time. */
export const ADVANTAGES: Advantage[] = [
  {
    group: 'Measured',
    icon: PhoneIcon,
    text: 'Footage from a normal phone on a tripod — no markers, no suits, no lab, nothing to install',
  },
  {
    group: 'Measured',
    icon: EyeIcon,
    text: "If the camera can't see the bowler clearly, we say so instead of inventing a number",
  },
  {
    group: 'Measured',
    icon: PulseIcon,
    text: 'The same two measurements on every ball, so sessions are actually comparable',
  },
  {
    group: 'Compared',
    icon: BarsIcon,
    text: 'A personal baseline you confirm, plus a rolling view of how it drifts over weeks',
  },
  {
    group: 'Compared',
    icon: CheckCircleIcon,
    text: 'One odd ball is noise — we flag a change only when 3 of the last 5 agree',
  },
  {
    group: 'Compared',
    icon: InfoIcon,
    text: 'Every flag shows its working: the numbers, the balls, and the margin of error',
  },
  {
    group: 'Coach-led',
    icon: UserPlusIcon,
    text: 'Approve a drill, dismiss it as a slower ball or yorker, or correct the frame we picked',
  },
  {
    group: 'Coach-led',
    icon: BookIcon,
    text: 'Drills come from a library written by accredited S&C coaches, not generated on the fly',
  },
  {
    group: 'Coach-led',
    icon: LockIcon,
    text: 'Raw video is deleted once the measurements are taken — summaries share numbers, not clips',
  },
];
