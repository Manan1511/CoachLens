import type {
  Athlete,
  BaselineConfirmResult,
  BaselineRecord,
  CoachActionResult,
  CoachActionType,
  CoachingReport,
  DeliverySummary,
  SessionStartResult,
  SessionSummary,
  WhatsAppExportResult,
} from '../types';

import {
  ATHLETE_ROWS,
  BASELINES,
  COACH_ACTIONS,
  DELIVERIES,
  SESSIONS,
  VERDICTS,
  nextId,
  toAthleteSummary,
  toReport,
} from './data';

/** Mimics each backend operation against the in-memory seed. Every function
 *  here has the same name and shape client.ts exposes, so swapping the real
 *  fetch calls in later means editing client.ts's function bodies only. */

function latestVerdictFor(deliveryId: string) {
  const rows = VERDICTS.filter((v) => v.delivery_id === deliveryId);
  return rows.length > 0 ? rows[rows.length - 1] : undefined;
}

function latestActionFor(verdictId: string) {
  return COACH_ACTIONS.filter((a) => a.verdict_id === verdictId).pop() ?? null;
}

/** Real endpoint: GET /api/v1/athletes (src/coaching/routes/athletes.py) —
 *  name-ordered, not scoped to the requesting coach (the real `athletes`
 *  table has no coach/club ownership column yet — a known multi-tenancy
 *  gap, not something to paper over here). */
export async function listAthletes(): Promise<Athlete[]> {
  return [...ATHLETE_ROWS].sort((a, b) => a.name.localeCompare(b.name)).map(toAthleteSummary);
}

export async function getAthlete(athleteId: string): Promise<Athlete | null> {
  const row = ATHLETE_ROWS.find((a) => a.id === athleteId);
  return row ? toAthleteSummary(row) : null;
}

/** Real endpoint: POST /api/v1/athletes/{athlete_id}/sessions — get-or-create
 *  today's session for an athlete (src/coaching/routes/athletes.py's
 *  start_or_resume_session). Reuses an existing session for the same
 *  athlete+date rather than creating a duplicate, exactly matching the real
 *  repository.get_or_create_session behaviour, so a coach quick-switching
 *  back to a bowler already recorded today gets the same session_id both
 *  times. */
export async function startSession(athleteId: string): Promise<SessionStartResult> {
  const athlete = ATHLETE_ROWS.find((a) => a.id === athleteId);
  if (!athlete) throw new Error(`No athlete found for athlete_id=${athleteId}`);

  const today = new Date().toISOString().slice(0, 10);
  const existing = SESSIONS.find((s) => s.athlete_id === athleteId && s.session_date === today);
  if (existing) {
    return { session_id: existing.id, athlete_id: athleteId, session_date: today, created: false };
  }

  const session = { id: nextId('SES', SESSIONS), athlete_id: athleteId, session_date: today };
  SESSIONS.push(session);
  return { session_id: session.id, athlete_id: athleteId, session_date: today, created: true };
}

/** Real endpoint: GET /api/v1/athletes/{id}/history — untyped nested
 *  sessions→deliveries→verdicts in production, whose current select
 *  (repository.get_athlete_history) only asks for `status, delta_deg,
 *  created_at`. `confidence`, the two raw kinematic values, and the
 *  coach-action fields below are NOT in that real response yet — see the
 *  comments on DeliverySummary in lib/api/types.ts for which of these are
 *  "real column, not-yet-selected" versus genuinely mock-only. */
export async function getAthleteHistory(athleteId: string): Promise<SessionSummary[]> {
  const sessions = SESSIONS.filter((s) => s.athlete_id === athleteId).sort((a, b) =>
    b.session_date.localeCompare(a.session_date),
  );

  return sessions.map((session) => {
    const deliveries = DELIVERIES.filter((d) => d.session_id === session.id).sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const summaries: DeliverySummary[] = deliveries.map((delivery) => {
      const verdict = latestVerdictFor(delivery.id);
      const action = verdict ? latestActionFor(verdict.id) : null;
      return {
        id: delivery.id,
        session_id: delivery.session_id,
        created_at: delivery.created_at,
        latest_status: verdict?.status ?? null,
        delta_deg: verdict?.delta_deg ?? null,
        confidence: verdict?.confidence ?? null,
        observed_knee_angle_deg: verdict?.observed_value_deg ?? null,
        trunk_tilt_deg: verdict?.trunk_tilt_deg ?? null,
        actioned: action?.action ?? null,
        action_note: action?.note ?? null,
      };
    });

    return {
      id: session.id,
      athlete_id: session.athlete_id,
      session_date: session.session_date,
      deliveries: summaries,
    };
  });
}

export async function getReport(deliveryId: string): Promise<CoachingReport | null> {
  const verdict = latestVerdictFor(deliveryId);
  return verdict ? toReport(verdict) : null;
}

/** Mock-only convenience — the real API has no action-readback endpoint at
 *  all, so a real dashboard can't yet show "already actioned" after a page
 *  reload either. Kept here, clearly separate from getReport, so the gap
 *  isn't hidden by pretending it's part of the real report shape. */
export async function getDeliveryAction(
  deliveryId: string,
): Promise<{ action: CoachActionType; note: string | null } | null> {
  const verdict = latestVerdictFor(deliveryId);
  if (!verdict) return null;
  const action = latestActionFor(verdict.id);
  return action ? { action: action.action, note: action.note } : null;
}

export async function getBaseline(
  athleteId: string,
  metric: string,
): Promise<BaselineRecord | null> {
  return BASELINES.find((b) => b.athlete_id === athleteId && b.metric === metric) ?? null;
}

export async function confirmBaseline(
  athleteId: string,
  metric: string,
  medianDeg: number,
  iqrDeg: number,
  confirmedBy: string,
): Promise<BaselineConfirmResult> {
  const existing = BASELINES.find((b) => b.athlete_id === athleteId && b.metric === metric);
  const now = new Date().toISOString();
  if (existing) {
    existing.median_deg = medianDeg;
    existing.iqr_deg = iqrDeg;
    existing.confirmed_by = confirmedBy;
    existing.confirmed_at = now;
  } else {
    BASELINES.push({
      athlete_id: athleteId,
      metric,
      median_deg: medianDeg,
      iqr_deg: iqrDeg,
      confirmed_by: confirmedBy,
      confirmed_at: now,
    });
  }
  return { athlete_id: athleteId, metric, confirmed: true, confirmed_by: confirmedBy };
}

/** Real endpoint: POST /api/v1/deliveries/{id}/action. `note` is a real
 *  field on the real request (coaching/schemas/action.py's
 *  CoachActionRequest) — there's just been no UI collecting one until now.
 *  The backend returns an untyped ack with no way to read the decision
 *  back later; this mock keeps a COACH_ACTIONS log so the dashboard can
 *  show "already actioned" (and its note), which the real API can't yet. */
export async function postCoachAction(
  deliveryId: string,
  action: CoachActionType,
  note: string | null,
  coachId: string,
): Promise<CoachActionResult> {
  const verdict = latestVerdictFor(deliveryId);
  if (!verdict) throw new Error(`No verdict found for delivery_id=${deliveryId}`);

  COACH_ACTIONS.push({
    id: nextId('ACT', COACH_ACTIONS),
    verdict_id: verdict.id,
    delivery_id: deliveryId,
    action,
    note,
    created_at: new Date().toISOString(),
  });

  return { delivery_id: deliveryId, verdict_id: verdict.id, action, coach_id: coachId };
}

/** Real endpoint: POST /api/v1/deliveries/{id}/nudge-ffs?frame_delta=N —
 *  shifts the FFS frame from the latest verdict and re-scores, inserting a
 *  new verdict row. This mock nudges the observed angle by a small amount
 *  per frame of shift as a stand-in for re-running the real pipeline. */
export async function nudgeFfs(deliveryId: string, frameDelta: number): Promise<CoachingReport> {
  const current = latestVerdictFor(deliveryId);
  if (!current) throw new Error(`No verdict found for delivery_id=${deliveryId}`);
  if (current.event_frame === null) {
    throw new Error('Cannot nudge FFS on a delivery with no detected event frame');
  }

  const nudged = {
    ...current,
    id: nextId('VER', VERDICTS),
    event_frame: current.event_frame + frameDelta,
    observed_value_deg:
      current.observed_value_deg !== null
        ? current.observed_value_deg + frameDelta * 0.4
        : null,
    created_at: new Date().toISOString(),
  };
  VERDICTS.push(nudged);
  return toReport(nudged);
}

const STATUS_DISPLAY: Record<string, string> = {
  DATA_SUPPRESSED: 'DATA SUPPRESSED',
  FORM_BENCHMARK: 'FORM BENCHMARK',
  MECHANICAL_WATCH: 'MECHANICAL WATCH',
  TECHNICAL_CONCERN: 'TECHNICAL CONCERN',
  BENCHMARK_PENDING: 'BENCHMARK PENDING',
};

/** Real endpoint: GET /api/v1/reports/{id}/export/whatsapp
 *  (coaching/export.py's format_whatsapp_card). Reproduces its structure —
 *  status, kinematics, baseline delta, drill, disclaimer — closely enough
 *  to preview the real feature, not a byte-for-byte match of its emoji
 *  formatting. */
export async function exportWhatsapp(deliveryId: string): Promise<WhatsAppExportResult | null> {
  const report = await getReport(deliveryId);
  if (!report) return null;

  const { verdict, kinematics: k, baselines: b, proposed_action } = report;
  const lines: string[] = ['CoachLens Biomechanical Review', `Delivery: ${report.delivery_id}`];

  lines.push(`Status: ${STATUS_DISPLAY[verdict.status]}`, `- ${verdict.summary}`);

  if (verdict.status !== 'DATA_SUPPRESSED') {
    lines.push('');
    if (k.ffs_frame !== null) lines.push(`Kinematics at FFS (Frame ${k.ffs_frame}):`);
    if (k.front_knee_angle_deg !== null)
      lines.push(`- Front Knee Angle: ${k.front_knee_angle_deg.toFixed(1)}°`);
    if (k.forward_trunk_tilt_deg !== null)
      lines.push(`- Forward Trunk Tilt: ${k.forward_trunk_tilt_deg.toFixed(1)}°`);
    if (b.fixed_reference_median_deg !== null && b.fixed_reference_iqr_deg !== null)
      lines.push(
        `- Baseline Reference: ${b.fixed_reference_median_deg.toFixed(1)}° (±${b.fixed_reference_iqr_deg.toFixed(1)}° IQR)`,
      );
    if (b.delta_deg !== null)
      lines.push(`- Baseline Delta: ${b.delta_deg > 0 ? '+' : ''}${b.delta_deg.toFixed(1)}°`);
  }

  if (proposed_action) {
    lines.push('', 'Recommended Drill:', `${proposed_action.title} (${proposed_action.drill_id})`);
    lines.push(`- Protocol: ${proposed_action.prescription}`);
    lines.push(`- Standard: ${proposed_action.credential}`);
    if (proposed_action.contraindications.length > 0) {
      lines.push(`- Contraindications: ${proposed_action.contraindications.join(', ')}`);
    }
  }

  lines.push('', `Note: ${verdict.clinical_disclaimer}`);

  return {
    delivery_id: report.delivery_id,
    report_id: report.report_id,
    status: verdict.status,
    formatted_text: lines.join('\n'),
  };
}
