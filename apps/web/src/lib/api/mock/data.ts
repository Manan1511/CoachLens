import type {
  Athlete,
  BaselineRecord,
  BowlingArm,
  CoachActionType,
  CoachingReport,
  DeliveryStatus,
  ProposedAction,
  WindowPattern,
} from '../types';

/** In-memory seed shaped like the real tables (athletes, sessions,
 *  deliveries, verdicts, baselines) so the mock handlers and, later, real
 *  fetch calls can share the exact same view types. Mutated in place by
 *  handlers.ts — this is a mock database, not fixture constants. */

/** The raw "row" shape, including fields the real AthleteSummary response
 *  deliberately never returns (dob) — mirrors athletes.py's own split
 *  between the DB row and the API-facing AthleteSummary it's reduced to. */
interface AthleteRow {
  id: string;
  name: string;
  dob: string | null;
  guardian_consent: boolean;
  bowling_arm: BowlingArm | null;
  /** Mock-only — see the comment on Athlete.gender in lib/api/types.ts. */
  gender: 'male' | 'female' | 'other';
}

const MINOR_AGE_CUTOFF = 18;

/** Mirrors coaching/consent.py's is_consent_blocked exactly: dob absent ->
 *  not blocked (can't determine minor status, and defaulting to blocked
 *  would lock out adults with no dob on file), otherwise minor + no
 *  guardian consent -> blocked. */
function isConsentBlocked(dob: string | null, guardianConsent: boolean): boolean {
  if (!dob) return false;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age < MINOR_AGE_CUTOFF && !guardianConsent;
}

/** Mirrors repository.py's _athlete_summary — reduces a row to exactly what
 *  GET /api/v1/athletes returns (no dob) plus the mock-only `gender`. */
export function toAthleteSummary(row: AthleteRow): Athlete {
  return {
    id: row.id,
    name: row.name,
    bowling_arm: row.bowling_arm,
    guardian_consent: row.guardian_consent,
    consent_blocked: isConsentBlocked(row.dob, row.guardian_consent),
    gender: row.gender,
  };
}

export const ATHLETE_ROWS: AthleteRow[] = [
  {
    id: 'ATH-001',
    name: 'Arjun Mehta',
    dob: '2010-03-14',
    guardian_consent: true,
    bowling_arm: 'RIGHT',
    gender: 'male',
  },
  {
    id: 'ATH-002',
    name: 'Priya Nair',
    dob: '2007-11-02',
    guardian_consent: false,
    bowling_arm: 'LEFT',
    gender: 'female',
  },
  {
    id: 'ATH-003',
    name: 'Rohan Iyer',
    dob: '2002-06-21',
    guardian_consent: true,
    bowling_arm: 'RIGHT',
    gender: 'male',
  },
  {
    id: 'ATH-004',
    name: 'Kabir Sethi',
    dob: '2011-01-30',
    guardian_consent: true,
    bowling_arm: 'LEFT',
    gender: 'other',
  },
];

interface MockVerdict {
  id: string;
  delivery_id: string;
  metric: string;
  status: DeliveryStatus;
  window_pattern: WindowPattern;
  window_matches: number;
  delta_deg: number | null;
  uncertainty_band_deg: number | null;
  summary: string;
  event_frame: number | null;
  observed_value_deg: number | null;
  confidence: number | null;
  trigger_deltas: number[] | null;
  filtered: boolean | null;
  trunk_tilt_deg: number | null;
  trunk_tilt_confidence: number | null;
  drill_id: string | null;
  created_at: string;
}

interface MockDelivery {
  id: string;
  session_id: string;
  athlete_id: string;
  created_at: string;
}

interface MockSession {
  id: string;
  athlete_id: string;
  session_date: string;
}

interface MockCoachAction {
  id: string;
  verdict_id: string;
  delivery_id: string;
  action: CoachActionType;
  note: string | null;
  created_at: string;
}

const DISCLAIMER =
  'Non-diagnostic coaching metric. Reported athlete pain strictly voids prompts.';

const SUMMARIES: Record<DeliveryStatus, string> = {
  FORM_BENCHMARK: 'Within established baseline range.',
  MECHANICAL_WATCH: 'Isolated deviation flagged for replay review.',
  TECHNICAL_CONCERN: 'Persistent deviation from baseline mechanics detected.',
  DATA_SUPPRESSED: 'Landmark visibility below threshold at the FFS frame.',
  BENCHMARK_PENDING: 'Measured, not yet scored — no confirmed baseline for this athlete.',
};

export const SESSIONS: MockSession[] = [
  { id: 'SES-001', athlete_id: 'ATH-001', session_date: '2026-08-20' },
  { id: 'SES-002', athlete_id: 'ATH-001', session_date: '2026-08-27' },
  { id: 'SES-003', athlete_id: 'ATH-001', session_date: '2026-09-03' },
  { id: 'SES-004', athlete_id: 'ATH-002', session_date: '2026-08-25' },
  { id: 'SES-005', athlete_id: 'ATH-002', session_date: '2026-09-01' },
  { id: 'SES-006', athlete_id: 'ATH-003', session_date: '2026-09-05' },
  { id: 'SES-007', athlete_id: 'ATH-004', session_date: '2026-08-15' },
];

export const DELIVERIES: MockDelivery[] = [
  { id: 'DLV-001', session_id: 'SES-001', athlete_id: 'ATH-001', created_at: '2026-08-20T09:12:00Z' },
  { id: 'DLV-002', session_id: 'SES-002', athlete_id: 'ATH-001', created_at: '2026-08-27T09:05:00Z' },
  { id: 'DLV-003', session_id: 'SES-003', athlete_id: 'ATH-001', created_at: '2026-09-03T09:20:00Z' },
  { id: 'DLV-004', session_id: 'SES-003', athlete_id: 'ATH-001', created_at: '2026-09-03T09:24:00Z' },
  { id: 'DLV-005', session_id: 'SES-004', athlete_id: 'ATH-002', created_at: '2026-08-25T14:00:00Z' },
  { id: 'DLV-006', session_id: 'SES-005', athlete_id: 'ATH-002', created_at: '2026-09-01T14:10:00Z' },
  { id: 'DLV-007', session_id: 'SES-006', athlete_id: 'ATH-003', created_at: '2026-09-05T11:00:00Z' },
  { id: 'DLV-008', session_id: 'SES-007', athlete_id: 'ATH-004', created_at: '2026-08-15T16:30:00Z' },
  // A short spell (SES-006) with rising trunk tilt across four balls —
  // the fixture behind the within-spell fatigue chart.
  { id: 'DLV-009', session_id: 'SES-006', athlete_id: 'ATH-003', created_at: '2026-09-05T11:04:00Z' },
  { id: 'DLV-010', session_id: 'SES-006', athlete_id: 'ATH-003', created_at: '2026-09-05T11:08:00Z' },
  { id: 'DLV-011', session_id: 'SES-006', athlete_id: 'ATH-003', created_at: '2026-09-05T11:12:00Z' },
];

export const VERDICTS: MockVerdict[] = [
  {
    id: 'VER-001',
    delivery_id: 'DLV-001',
    metric: 'front_knee_angle_deg',
    status: 'FORM_BENCHMARK',
    window_pattern: 'NOT_APPLICABLE',
    window_matches: 0,
    delta_deg: 0.8,
    uncertainty_band_deg: 3.2,
    summary: SUMMARIES.FORM_BENCHMARK,
    event_frame: 142,
    observed_value_deg: 168.2,
    confidence: 0.94,
    trigger_deltas: null,
    filtered: true,
    trunk_tilt_deg: 31.4,
    trunk_tilt_confidence: 0.88,
    drill_id: null,
    created_at: '2026-08-20T09:12:04Z',
  },
  {
    id: 'VER-002',
    delivery_id: 'DLV-002',
    metric: 'front_knee_angle_deg',
    status: 'MECHANICAL_WATCH',
    window_pattern: 'ISOLATED',
    window_matches: 1,
    delta_deg: -5.6,
    uncertainty_band_deg: 3.2,
    summary: SUMMARIES.MECHANICAL_WATCH,
    event_frame: 138,
    observed_value_deg: 161.8,
    confidence: 0.91,
    trigger_deltas: [-5.6],
    filtered: true,
    trunk_tilt_deg: 33.1,
    trunk_tilt_confidence: 0.86,
    drill_id: null,
    created_at: '2026-08-27T09:05:03Z',
  },
  {
    id: 'VER-003',
    delivery_id: 'DLV-003',
    metric: 'front_knee_angle_deg',
    status: 'TECHNICAL_CONCERN',
    window_pattern: '3_OF_5_MATCHED',
    window_matches: 3,
    delta_deg: -6.4,
    uncertainty_band_deg: 3.2,
    summary: SUMMARIES.TECHNICAL_CONCERN,
    event_frame: 140,
    observed_value_deg: 161.0,
    confidence: 0.93,
    trigger_deltas: [-5.6, -4.8, -6.4],
    filtered: true,
    trunk_tilt_deg: 34.0,
    trunk_tilt_confidence: 0.85,
    drill_id: 'DRL-SNC-012',
    created_at: '2026-09-03T09:20:05Z',
  },
  {
    id: 'VER-004',
    delivery_id: 'DLV-004',
    metric: 'front_knee_angle_deg',
    status: 'DATA_SUPPRESSED',
    window_pattern: 'NOT_APPLICABLE',
    window_matches: 0,
    delta_deg: null,
    uncertainty_band_deg: null,
    summary: SUMMARIES.DATA_SUPPRESSED,
    event_frame: null,
    observed_value_deg: null,
    confidence: 0.52,
    trigger_deltas: null,
    filtered: null,
    trunk_tilt_deg: null,
    trunk_tilt_confidence: null,
    drill_id: null,
    created_at: '2026-09-03T09:24:02Z',
  },
  {
    id: 'VER-005',
    delivery_id: 'DLV-005',
    metric: 'front_knee_angle_deg',
    status: 'FORM_BENCHMARK',
    window_pattern: 'NOT_APPLICABLE',
    window_matches: 0,
    delta_deg: -1.2,
    uncertainty_band_deg: 3.2,
    summary: SUMMARIES.FORM_BENCHMARK,
    event_frame: 150,
    observed_value_deg: 172.8,
    confidence: 0.9,
    trigger_deltas: null,
    filtered: true,
    trunk_tilt_deg: 29.7,
    trunk_tilt_confidence: 0.9,
    drill_id: null,
    created_at: '2026-08-25T14:00:04Z',
  },
  {
    id: 'VER-006',
    delivery_id: 'DLV-006',
    metric: 'front_knee_angle_deg',
    status: 'MECHANICAL_WATCH',
    window_pattern: 'ISOLATED',
    window_matches: 1,
    delta_deg: 4.9,
    uncertainty_band_deg: 3.2,
    summary: SUMMARIES.MECHANICAL_WATCH,
    event_frame: 146,
    observed_value_deg: 178.9,
    confidence: 0.87,
    trigger_deltas: [4.9],
    filtered: true,
    trunk_tilt_deg: 30.2,
    trunk_tilt_confidence: 0.83,
    drill_id: null,
    created_at: '2026-09-01T14:10:03Z',
  },
  {
    id: 'VER-007',
    delivery_id: 'DLV-007',
    metric: 'front_knee_angle_deg',
    status: 'FORM_BENCHMARK',
    window_pattern: 'NOT_APPLICABLE',
    window_matches: 0,
    delta_deg: 1.8,
    uncertainty_band_deg: 3.2,
    summary: SUMMARIES.FORM_BENCHMARK,
    event_frame: 135,
    observed_value_deg: 176.0,
    confidence: 0.95,
    trigger_deltas: null,
    filtered: true,
    trunk_tilt_deg: 28.4,
    trunk_tilt_confidence: 0.92,
    drill_id: null,
    created_at: '2026-09-05T11:00:06Z',
  },
  {
    id: 'VER-008',
    delivery_id: 'DLV-008',
    metric: 'front_knee_angle_deg',
    status: 'FORM_BENCHMARK',
    window_pattern: 'NOT_APPLICABLE',
    window_matches: 0,
    delta_deg: 0.3,
    uncertainty_band_deg: 3.2,
    summary: SUMMARIES.FORM_BENCHMARK,
    event_frame: 144,
    observed_value_deg: 174.1,
    confidence: 0.92,
    trigger_deltas: null,
    filtered: true,
    trunk_tilt_deg: 32.0,
    trunk_tilt_confidence: 0.89,
    drill_id: null,
    created_at: '2026-08-15T16:30:05Z',
  },
  // The rest of Rohan's SES-006 spell: trunk tilt creeps up ball-by-ball
  // (28.4 -> 29.6 -> 30.9 -> 32.5) while front-knee delta stays mild until
  // the last ball, matching the PRD's "fatigue shows up as trunk-tilt
  // drift before anything else" framing.
  {
    id: 'VER-009',
    delivery_id: 'DLV-009',
    metric: 'front_knee_angle_deg',
    status: 'FORM_BENCHMARK',
    window_pattern: 'NOT_APPLICABLE',
    window_matches: 0,
    delta_deg: 2.4,
    uncertainty_band_deg: 3.2,
    summary: SUMMARIES.FORM_BENCHMARK,
    event_frame: 136,
    observed_value_deg: 176.6,
    confidence: 0.94,
    trigger_deltas: null,
    filtered: true,
    trunk_tilt_deg: 29.6,
    trunk_tilt_confidence: 0.91,
    drill_id: null,
    created_at: '2026-09-05T11:04:05Z',
  },
  {
    id: 'VER-010',
    delivery_id: 'DLV-010',
    metric: 'front_knee_angle_deg',
    status: 'MECHANICAL_WATCH',
    window_pattern: 'ISOLATED',
    window_matches: 1,
    delta_deg: 5.1,
    uncertainty_band_deg: 3.2,
    summary: SUMMARIES.MECHANICAL_WATCH,
    event_frame: 134,
    observed_value_deg: 179.3,
    confidence: 0.9,
    trigger_deltas: [5.1],
    filtered: true,
    trunk_tilt_deg: 30.9,
    trunk_tilt_confidence: 0.88,
    drill_id: null,
    created_at: '2026-09-05T11:08:05Z',
  },
  {
    id: 'VER-011',
    delivery_id: 'DLV-011',
    metric: 'front_knee_angle_deg',
    status: 'TECHNICAL_CONCERN',
    window_pattern: '3_OF_5_MATCHED',
    window_matches: 3,
    delta_deg: 7.1,
    uncertainty_band_deg: 3.2,
    summary: SUMMARIES.TECHNICAL_CONCERN,
    event_frame: 133,
    observed_value_deg: 181.3,
    confidence: 0.95,
    trigger_deltas: [5.1, 6.2, 7.1],
    filtered: true,
    trunk_tilt_deg: 32.5,
    trunk_tilt_confidence: 0.86,
    drill_id: 'DRL-SNC-012',
    created_at: '2026-09-05T11:12:05Z',
  },
];

export const BASELINES: BaselineRecord[] = [
  {
    athlete_id: 'ATH-001',
    metric: 'front_knee_angle_deg',
    median_deg: 167.4,
    iqr_deg: 3.1,
    confirmed_by: 'coach-demo',
    confirmed_at: '2026-08-10T10:00:00Z',
  },
  {
    athlete_id: 'ATH-002',
    metric: 'front_knee_angle_deg',
    median_deg: 174.0,
    iqr_deg: 2.6,
    confirmed_by: 'coach-demo',
    confirmed_at: '2026-08-12T10:00:00Z',
  },
  {
    athlete_id: 'ATH-003',
    metric: 'front_knee_angle_deg',
    median_deg: 174.2,
    iqr_deg: 2.9,
    confirmed_by: 'coach-demo',
    confirmed_at: '2026-08-18T10:00:00Z',
  },
  {
    athlete_id: 'ATH-004',
    metric: 'front_knee_angle_deg',
    median_deg: 173.8,
    iqr_deg: 3.4,
    confirmed_by: 'coach-demo',
    confirmed_at: '2026-08-01T10:00:00Z',
  },
];

export const DRILLS: Record<string, ProposedAction> = {
  'DRL-SNC-012': {
    drill_id: 'DRL-SNC-012',
    title: 'Front-leg block reinforcement',
    prescription:
      '3x8 single-leg RDL to a braced landing, 3x pogo hops focusing on stiff front-leg contact, twice weekly.',
    contraindications: ['Acute knee pain', 'Recent hamstring strain (under 4 weeks)'],
    credential: 'UKCC Level 3 Strength & Conditioning',
  },
};

export const COACH_ACTIONS: MockCoachAction[] = [];

export function nextId(prefix: string, existing: { id: string }[]): string {
  const n = existing.length + 1;
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

export function toReport(verdict: MockVerdict): CoachingReport {
  const baseline =
    verdict.status !== 'DATA_SUPPRESSED' && verdict.status !== 'BENCHMARK_PENDING'
      ? BASELINES.find(
          (b) =>
            b.athlete_id === DELIVERIES.find((d) => d.id === verdict.delivery_id)?.athlete_id &&
            b.metric === verdict.metric,
        )
      : undefined;

  const drill = verdict.drill_id ? (DRILLS[verdict.drill_id] ?? null) : null;

  return {
    report_id: `RPT-${verdict.delivery_id}`,
    delivery_id: verdict.delivery_id,
    evaluation_timestamp: verdict.created_at,
    kinematics: {
      ffs_frame: verdict.event_frame,
      front_knee_angle_deg: verdict.observed_value_deg,
      front_knee_confidence: verdict.confidence,
      forward_trunk_tilt_deg: verdict.trunk_tilt_deg,
      trunk_tilt_confidence: verdict.trunk_tilt_confidence,
      filtered: verdict.filtered,
    },
    baselines: baseline
      ? {
          fixed_reference_median_deg: baseline.median_deg,
          fixed_reference_iqr_deg: baseline.iqr_deg,
          rolling_6wk_median_deg: null,
          delta_deg: verdict.delta_deg,
          uncertainty_band_deg: verdict.uncertainty_band_deg,
        }
      : {
          fixed_reference_median_deg: null,
          fixed_reference_iqr_deg: null,
          rolling_6wk_median_deg: null,
          delta_deg: null,
          uncertainty_band_deg: null,
        },
    verdict: {
      status: verdict.status,
      window_pattern: verdict.window_pattern,
      window_matches: verdict.window_matches,
      trigger_context_deltas: verdict.trigger_deltas,
      summary: verdict.summary,
      clinical_disclaimer: DISCLAIMER,
    },
    proposed_action: drill ?? null,
  };
}
