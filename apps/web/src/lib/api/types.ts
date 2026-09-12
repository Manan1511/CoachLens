/** Hand-typed from services/coaching-api's real schemas and its OpenAPI
 *  export — not generated, since three of the real responses (action,
 *  baseline-confirm, history) are typed `dict`/`list[dict]` in the backend.
 *  Kept in sync by hand; last checked against the backend after the
 *  2026-09-12 merge that added GET/POST /api/v1/athletes, bowling_arm, and
 *  BENCHMARK_PENDING (src/schemas/athlete.py, src/schemas/status.py,
 *  supabase/migrations/20260912141500_add_bowling_arm_to_athletes.sql,
 *  .../20260912150000_add_benchmark_pending_status.sql).
 *
 *  DeliveryStatus values are the canonical ones from src/schemas/status.py.
 *  The PRD markdown's `UNCLASSIFIED_DEVIATION` is stale — `MECHANICAL_WATCH`
 *  is what the backend (and the DB enum) actually uses. */

export type DeliveryStatus =
  | 'DATA_SUPPRESSED'
  | 'FORM_BENCHMARK'
  | 'MECHANICAL_WATCH'
  | 'TECHNICAL_CONCERN'
  | 'BENCHMARK_PENDING';

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
  /** Deferred backend-side — no athlete has 6 weeks of history yet. Always
   *  null in production, so no "fixed vs rolling" comparison view is built
   *  against it here — there is nothing yet to compare. */
  rolling_6wk_median_deg: number | null;
  delta_deg: number | null;
  uncertainty_band_deg: number | null;
}

export interface Verdict {
  status: DeliveryStatus;
  window_pattern: WindowPattern;
  window_matches: number;
  /** The prior deltas that fed this verdict's rolling window — the evidence
   *  behind "why was this flagged". Null for FORM_BENCHMARK/DATA_SUPPRESSED/
   *  BENCHMARK_PENDING, where no window was evaluated. */
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

export interface WhatsAppExportResult {
  delivery_id: string;
  report_id: string;
  status: DeliveryStatus;
  formatted_text: string;
}

/* ── Real, as of the latest merge ──
 * GET/POST /api/v1/athletes exist now (src/coaching/routes/athletes.py).
 * `bowling_arm` is a real column (RIGHT/LEFT, nullable for pre-migration
 * rows). AthleteSummary deliberately omits `dob` — the API computes
 * `consent_blocked` server-side instead, so no client ever needs to run its
 * own age math or hold a minor's birthdate just to know whether they can be
 * recorded. */

export type BowlingArm = 'RIGHT' | 'LEFT';

export interface Athlete {
  id: string;
  name: string;
  bowling_arm: BowlingArm | null;
  guardian_consent: boolean;
  consent_blocked: boolean;
  /** NOT a real column (services/coaching-api's athletes table has no
   *  gender field, and the latest migration only added bowling_arm) —
   *  mock-only, kept for the demographic-context display until a teammate
   *  decides whether this belongs in the schema at all. */
  gender: 'male' | 'female' | 'other';
}

export interface DeliverySummary {
  id: string;
  session_id: string;
  created_at: string;
  /** Latest verdict for this delivery — null if ingest hasn't scored it yet
   *  (not modeled in the mock data, kept for shape-honesty). */
  latest_status: DeliveryStatus | null;
  /** The delta that produced `latest_status`. Null for DATA_SUPPRESSED (no
   *  measurement), BENCHMARK_PENDING (nothing to compare against yet), or
   *  when no verdict exists. */
  delta_deg: number | null;
  /** `verdicts.confidence` and `.trunk_tilt_deg` are real columns
   *  (src/coaching/repository.py's save_verdict), but GET .../history's
   *  current select (repository.get_athlete_history) only asks for
   *  `status, delta_deg, created_at` — these two are NOT in the real
   *  response yet. Modelled here as a one-line select expansion your
   *  teammate would need to make, not a fabricated capability. */
  confidence: number | null;
  observed_knee_angle_deg: number | null;
  trunk_tilt_deg: number | null;
  /** Whether a coach has already approved/dismissed this delivery's latest
   *  verdict, and any note recorded with that decision. `note` is a real
   *  field on the real POST .../action request (coaching/schemas/action.py)
   *  — but there is still no read-back endpoint for either value; both are
   *  mock-only until one exists. */
  actioned: CoachActionType | null;
  action_note: string | null;
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
