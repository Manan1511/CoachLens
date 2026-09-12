import type {
  Athlete,
  BaselineConfirmResult,
  BaselineRecord,
  CoachActionResult,
  CoachActionType,
  CoachingReport,
  DeliverySummary,
  SessionSummary,
} from '../types';

import {
  ATHLETES,
  BASELINES,
  COACH_ACTIONS,
  DELIVERIES,
  SESSIONS,
  VERDICTS,
  nextId,
  toReport,
} from './data';

/** Mimics each backend operation against the in-memory seed. Every function
 *  here has the same name and shape client.ts exposes, so swapping the real
 *  fetch calls in later means editing client.ts's function bodies only. */

function latestVerdictFor(deliveryId: string) {
  const rows = VERDICTS.filter((v) => v.delivery_id === deliveryId);
  return rows.length > 0 ? rows[rows.length - 1] : undefined;
}

function actionFor(verdictId: string): CoachActionType | null {
  const action = COACH_ACTIONS.filter((a) => a.verdict_id === verdictId).pop();
  return action?.action ?? null;
}

export async function listAthletes(): Promise<Athlete[]> {
  return ATHLETES;
}

export async function getAthlete(athleteId: string): Promise<Athlete | null> {
  return ATHLETES.find((a) => a.id === athleteId) ?? null;
}

/** Real endpoint: GET /api/v1/athletes/{id}/history — untyped nested
 *  sessions→deliveries→verdicts in production. Reshaped here into the
 *  typed SessionSummary/DeliverySummary view so the dashboard never
 *  touches the raw nested shape directly. */
export async function getAthleteHistory(athleteId: string): Promise<SessionSummary[]> {
  const sessions = SESSIONS.filter((s) => s.athlete_id === athleteId).sort((a, b) =>
    b.session_date.localeCompare(a.session_date),
  );

  return sessions.map((session) => {
    const deliveries = DELIVERIES.filter((d) => d.session_id === session.id);
    const summaries: DeliverySummary[] = deliveries.map((delivery) => {
      const verdict = latestVerdictFor(delivery.id);
      return {
        id: delivery.id,
        session_id: delivery.session_id,
        created_at: delivery.created_at,
        latest_status: verdict?.status ?? null,
        delta_deg: verdict?.delta_deg ?? null,
        actioned: verdict ? actionFor(verdict.id) : null,
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
 *  all (see the plan's "what's missing" research), so a real dashboard
 *  can't yet show "already actioned" after a page reload either. Kept here,
 *  clearly separate from getReport, so the gap isn't hidden by pretending
 *  it's part of the real report shape. */
export async function getDeliveryAction(deliveryId: string): Promise<CoachActionType | null> {
  const verdict = latestVerdictFor(deliveryId);
  return verdict ? actionFor(verdict.id) : null;
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

/** Real endpoint: POST /api/v1/deliveries/{id}/action. The backend accepts
 *  APPROVE/DISMISS and returns an untyped ack with no way to read the
 *  decision back later — this mock keeps a COACH_ACTIONS log so the
 *  dashboard can show "already actioned", which the real API can't yet. */
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
