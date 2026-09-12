import { CrosshairIcon, WaveformIcon } from '@/components/icons';
import type { ScienceCard } from '@/types';

export const SCIENCE_HEADER = {
  label: 'What we measure',
  title: 'Two things, ',
  titleAccent: 'measured properly',
  intro:
    "We'd rather do two measurements well than twenty badly. Both are taken from a single side-on view, and both come with their working shown.",
} as const;

export const SCIENCE_CARDS: ScienceCard[] = [
  {
    icon: WaveformIcon,
    title: 'Front knee at landing',
    desc: "Whether the front leg stays braced as a lever or collapses into the ground at front foot contact. It's one of the clearest markers of how a bowler is transferring effort, and one of the first things to shift when they tire.",
    rows: [
      { label: 'Taken at', value: 'Front foot landing' },
      { label: 'Camera view', value: 'Side-on' },
      { label: 'Compared to', value: 'Their own baseline' },
    ],
  },
  {
    icon: CrosshairIcon,
    title: 'Trunk lean at release',
    desc: 'How far forward the upper body is at the moment of release. It shapes release height and trajectory, and a steady drift across a spell is often the first visible sign of fatigue setting in.',
    rows: [
      { label: 'Taken at', value: 'Ball release' },
      { label: 'Camera view', value: 'Side-on' },
      { label: 'Compared to', value: 'Start of the spell' },
    ],
  },
];

/** The worked example that shows the engine's reasoning, never a diagnosis. */
export const TRANSPARENCY = {
  title: '"Why am I seeing this?"',
  badge: 'Example',
  columns: [
    {
      heading: 'What we saw',
      body: "Ball 24 came in 14° below this bowler's usual front knee angle, with a clear view of the landing. Balls 20 and 22 showed the same thing.",
    },
    {
      heading: 'What it might mean',
      body: "The front leg isn't bracing the way it normally does for this bowler. Worth a look: your call on whether it's fatigue, surface, or something they're trying.",
    },
  ],
  actions: [
    { label: 'Approve drill', primary: true },
    { label: 'Dismiss (tactical)', primary: false },
    { label: 'Fix the frame', primary: false },
  ],
} as const;
