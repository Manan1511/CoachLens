import type { MetricTarget } from '@/types';

/** No field trial running anymore — reframed around the fixed thresholds
 *  the system actually enforces on every delivery (CoachLens_PRD.md §6.2,
 *  §9), not a claim of external validation against a study that isn't
 *  happening. Every number here is a real constant already live in the
 *  scoring logic, not a target under test. */
export const METRICS_HEADER = {
  label: 'What we hold ourselves to',
  title: 'The thresholds behind ',
  titleAccent: 'every verdict',
  intro:
    "Not results from a study — these are the fixed rules the system runs every delivery through before a coach ever sees a number.",
} as const;

export const METRIC_TARGETS: MetricTarget[] = [
  {
    target: 70,
    symbol: '%',
    label: 'Minimum landmark confidence before a delivery is scored at all',
  },
  {
    target: 3,
    label: 'Matching deliveries out of the last 5 needed before a change is flagged',
  },
  {
    target: 3.2,
    symbol: '°',
    label: 'Smallest deviation from personal baseline that counts as real, not noise',
  },
  {
    target: 15,
    symbol: 's',
    label: 'Slowest a report should take to come back after upload (P95)',
  },
  {
    target: 8,
    symbol: '%',
    label: 'Most frame-pacing jitter allowed before a clip is rejected outright',
  },
];
