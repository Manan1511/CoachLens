import type { Step } from '@/types';

export const STEPS_HEADER = {
  label: 'How it works',
  title: 'Four steps, ',
  titleAccent: 'one net session',
} as const;

export const STEPS: Step[] = [
  {
    number: '01',
    label: 'Step 01',
    title: 'Set the camera down',
    desc: 'Any phone on a tripod at hip height, about three metres side-on to the crease, lens up against the net. Our framing guide gets you there in under thirty seconds, and the same position every session is what makes the numbers comparable.',
    image: {
      src: '/images/how-it-works.jpg',
      alt: 'Phone mounted on a tripod beside cricket nets',
    },
  },
  {
    number: '02',
    label: 'Step 02',
    title: 'Film the spell',
    desc: 'Record with the camera app already on the phone: nothing to install, nothing to sign into at the nets. Shoot at the highest frame rate it offers and let the session run.',
  },
  {
    number: '03',
    label: 'Step 03',
    title: 'Upload to CoachLens',
    desc: 'Drop the clips into your browser, from the pavilion or from home. We check each one is usable before analysing it: steady frame rate, no motion blur, and bowler clearly visible. Unusable clips get flagged, not guessed at.',
  },
  {
    number: '04',
    label: 'Step 04',
    title: 'Review and decide',
    desc: "Each delivery comes back with two numbers, how they compare to that bowler's baseline, and a plain-language note on what changed. Assign a drill, dismiss the flag, or just log it; then share a clean summary of the numbers without sharing the video.",
  },
];
