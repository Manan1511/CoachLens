import type { DeliveryStatus } from '@/lib/api/types';

/** Plain-language labels for each verdict state, written to the same
 *  register as DESIGN.md's copy rules: what it means, never what it
 *  "risks". See CoachLens_PRD.md §1/§2 and DESIGN.md §7: MECHANICAL_WATCH
 *  never opens an action menu, and DATA_SUPPRESSED is an absence of
 *  measurement, not a bad score. */
export const VERDICT_COPY: Record<
  DeliveryStatus,
  { label: string; tone: 'green' | 'yellow' | 'red' | 'muted'; helper: string }
> = {
  FORM_BENCHMARK: {
    label: 'On baseline',
    tone: 'green',
    helper: "Matches this athlete's own confirmed baseline.",
  },
  MECHANICAL_WATCH: {
    label: 'Flagged: Watch',
    tone: 'yellow',
    helper: 'A one-off difference: replay only, no action needed yet.',
  },
  TECHNICAL_CONCERN: {
    label: 'Flagged: Concern',
    tone: 'red',
    helper: '3 or more of the last 5 deliveries show the same difference.',
  },
  DATA_SUPPRESSED: {
    label: 'No measurement',
    tone: 'muted',
    helper: "The camera view wasn't clear enough to measure this delivery.",
  },
  BENCHMARK_PENDING: {
    label: 'Not yet scored',
    tone: 'muted',
    helper: "Measured, but this athlete has no confirmed baseline to compare it against yet.",
  },
};
