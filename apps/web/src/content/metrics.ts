import type { MetricTarget } from '@/types';

/** Stated as targets under test, not achieved results — the Stage 1 trial
 *  is still running. If that changes, update the intro copy with them. */
export const METRICS_HEADER = {
  label: 'What we hold ourselves to',
  title: "Targets we're ",
  titleAccent: 'testing against',
  intro:
    "We're running a field trial with 18 bowlers, checking our numbers against frame-by-frame measurements from an accredited biomechanist. These are the bars we set before we started.",
} as const;

export const METRIC_TARGETS: MetricTarget[] = [
  {
    target: 4.0,
    symbol: '°',
    label: 'Target error on front knee angle, against expert measurement',
  },
  { target: 3.5, symbol: '°', label: 'Target error on trunk lean at release' },
  {
    target: 80,
    symbol: '%',
    label: "Agreement we want with an accredited coach's own judgement",
  },
  {
    target: 8,
    symbol: 's',
    label: 'How long a delivery should take to come back after upload',
  },
  { target: 18, label: 'Bowlers in the current field trial, across 150+ deliveries' },
];
