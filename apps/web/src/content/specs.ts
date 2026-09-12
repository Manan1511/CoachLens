import {
  BrowserIcon,
  LockIcon,
  PhoneIcon,
  ShieldIcon,
  SunIcon,
  TripodIcon,
} from '@/components/icons';
import type { SpecCard } from '@/types';

export const SPECS_HEADER = {
  label: 'What you need',
  title: 'Built for ',
  titleAccent: 'real nets',
} as const;

export const SPEC_CARDS: SpecCard[] = [
  {
    icon: PhoneIcon,
    title: 'A phone to film on',
    value: '60–120 fps',
    desc: 'Most phones from the last few years shoot fast enough, using the camera app they already have.',
  },
  {
    icon: TripodIcon,
    title: 'A tripod',
    value: '3m side-on',
    desc: 'Hip height, lens against the netting, square to the crease. Fits a standard net lane.',
  },
  {
    icon: SunIcon,
    title: 'Daylight',
    value: 'Outdoor',
    desc: 'Normal daytime sessions. No lighting rig, no indoor studio, no marker suits.',
  },
  {
    icon: BrowserIcon,
    title: 'A web browser',
    value: 'No install',
    desc: 'Upload and review in the browser, on a laptop at home or a phone at the ground.',
  },
  {
    icon: ShieldIcon,
    title: 'Guardian consent',
    value: 'Under 18s',
    desc: 'Young bowlers need a guardian to sign off before a profile goes live.',
  },
  {
    icon: LockIcon,
    title: 'No video kept',
    value: 'Deleted',
    desc: 'Clips are discarded once measured. Only the numbers are stored, and only for your athletes.',
  },
];
