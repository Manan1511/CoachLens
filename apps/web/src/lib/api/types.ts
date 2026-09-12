/** Hand-typed from services/coaching-api's real schemas (src/schemas/status.py,
 *  src/schemas/report.py) and its OpenAPI export (docs/openapi.json) — not
 *  generated, since three of the real responses (action, baseline-confirm,
 *  history) are typed `dict`/`list[dict]` in the backend and OpenAPI only
 *  gives back bare `object`. Kept in sync by hand until the backend tightens
 *  those.
 *
 *  DeliveryStatus values are the canonical ones from src/schemas/status.py.
 *  The PRD markdown's `UNCLASSIFIED_DEVIATION` is stale — `MECHANICAL_WATCH`
 *  is what the backend (and the DB enum) actually uses. */

export type DeliveryStatus =
  | 'DATA_SUPPRESSED'
  | 'FORM_BENCHMARK'
  | 'MECHANICAL_WATCH'
  | 'TECHNICAL_CONCERN';

export type WindowPattern = 'NOT_APPLICABLE' | 'ISOLATED' | '3_OF_5_MATCHED';

export interface Kinematics {
  ffs_frame: number | null;
  front_knee_angle_deg: number | null;
  front_knee_confidence: number | null;
  forward_trunk_tilt_deg: number | null;
  trunk_tilt_confidence: number | null;
  /** False when too few frames existed for the Butterworth filter and this
   *  angle came from raw, unsmoothed keypoints instead. */
  filtered: boolean | null;
}

export interface Baselines {
  fixed_reference_median_deg: number | null;
  fixed_reference_iqr_deg: number | null;
  /** Deferred backend-side — no athlete has 6 weeks of history yet. Always null. */
  rolling_6wk_median_deg: number | null;
  delta_deg: number | null;
  uncertainty_band_deg: number | null;
}

export interface Verdict {
  status: DeliveryStatus;
  window_pattern: WindowPattern;
  window_matches: number;
  /** The prior deltas that fed this verdict's rolling window — the evidence
   *  behind "why was this flagged". Null for FORM_BENCHMARK/DATA_SUPPRESSED,
   *  where no window was evaluated. */
  trigger_context_deltas: number[] | null;
  summary: string;
  /** Ships on every verdict, verbatim. Never optional, never hidden. */
  clinical_disclaimer: string;
}

export interface ProposedAction {
  drill_id: string;
  title: string;
  prescription: string;
  /** Informational text only — the backend models no athlete medical data,
   *  so this is never a clearance check. */
  contraindications: string[];
  credential: string;
}

export interface CoachingReport {
  report_id: string;
  delivery_id: string;
  evaluation_timestamp: string;
  kinematics: Kinematics;
  baselines: Baselines;
  verdict: Verdict;
  /** Only populated when verdict.status === 'TECHNICAL_CONCERN'. */
  proposed_action: ProposedAction | null;
}

export type CoachActionType = 'APPROVE' | 'DISMISS';

export interface CoachActionResult {
  delivery_id: string;
  verdict_id: string;
  action: CoachActionType;
  coach_id: string;
}

export interface BaselineConfirmResult {
  athlete_id: string;
  metric: string;
  confirmed: true;
  confirmed_by: string;
}

/* ── Dashboard-only view types ──
 * The backend has no list-athletes, no session, and no action-readback
 * endpoint at all — these exist so the dashboard has something typed to
 * render against. They are shaped to match the real DB columns
 * (services/coaching-api/supabase/migrations) so swapping the mock layer
 * for real endpoints later, once your teammate adds them, doesn't change
 * these shapes. */

export interface Athlete {
  id: string;
  name: string;
  dob: string | null;
  guardian_consent: boolean;
}

export interface DeliverySummary {
  id: string;
  session_id: string;
  created_at: string;
  /** Latest verdict for this delivery — undefined if ingest hasn't scored
   *  it yet (not modeled in the mock data, kept for shape-honesty). */
  latest_status: DeliveryStatus | null;
  /** Whether a coach has already approved/dismissed this delivery's latest
   *  verdict. The real API has no way to read this back yet — mock-only. */
  actioned: CoachActionType | null;
}

export interface SessionSummary {
  id: string;
  athlete_id: string;
  session_date: string;
  deliveries: DeliverySummary[];
}

export interface BaselineRecord {
  athlete_id: string;
  metric: string;
  median_deg: number;
  iqr_deg: number;
  confirmed_by: string | null;
  confirmed_at: string | null;
}

export const METRICS = ['front_knee_angle_deg', 'forward_trunk_tilt_deg'] as const;
export type Metric = (typeof METRICS)[number];

export const METRIC_LABELS: Record<Metric, string> = {
  front_knee_angle_deg: 'Front knee angle at landing',
  forward_trunk_tilt_deg: 'Trunk lean at release',
};
