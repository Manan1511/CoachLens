import { apiFetch, ApiError } from './http';
import { rememberAction, recallAction } from './action-memory';
import type {
  Athlete,
  BaselineConfirmResult,
  BaselineRecord,
  CoachActionResult,
  CoachActionType,
  CoachingReport,
  DeliveryIngestionRequest,
  DeliverySummary,
  DeliveryStatus,
  SessionStartResult,
  SessionSummary,
  WhatsAppExportResult,
} from './types';

/** The dashboard's only door to the backend — every function here is a real
 *  call against services/coaching-api. Three real gaps stayed real gaps
 *  rather than getting papered over — see the comments on each below:
 *  no single-athlete GET, no baseline GET, and no action-readback GET. */

/* ── Real shapes coming back over the wire, before reshaping ── */

interface AthleteSummaryDto {
  id: string;
  name: string;
  bowling_arm: 'RIGHT' | 'LEFT' | null;
  guardian_consent: boolean;
  consent_blocked: boolean;
}

interface HistoryVerdictDto {
  status: DeliveryStatus;
  delta_deg: number | null;
  created_at: string;
}

interface HistoryDeliveryDto {
  id: string;
  created_at: string;
  verdicts: HistoryVerdictDto[];
}

interface HistorySessionDto {
  id: string;
  session_date: string;
  deliveries: HistoryDeliveryDto[];
}

function toAthlete(dto: AthleteSummaryDto): Athlete {
  return {
    id: dto.id,
    name: dto.name,
    bowling_arm: dto.bowling_arm,
    guardian_consent: dto.guardian_consent,
    consent_blocked: dto.consent_blocked,
  };
}

/** A delivery can carry more than one verdict row (each Nudge FFS
 *  re-evaluation inserts a new one rather than replacing the last), and
 *  the real nested embed (repository.get_athlete_history) returns every
 *  one of them, unfiltered — this picks the latest by `created_at`, same
 *  as get_latest_verdict_for_delivery does server-side for a single
 *  delivery's own report. */
function latestVerdict(verdicts: HistoryVerdictDto[]): HistoryVerdictDto | null {
  if (verdicts.length === 0) return null;
  return [...verdicts].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

async function fetchAthleteHistory(athleteId: string): Promise<SessionSummary[]> {
  const sessions = await apiFetch<HistorySessionDto[]>(
    `/api/v1/athletes/${athleteId}/history`,
  );

  return sessions.map((session) => {
    const deliveries: DeliverySummary[] = session.deliveries.map((delivery) => {
      const verdict = latestVerdict(delivery.verdicts);
      const remembered = recallAction(delivery.id);
      return {
        id: delivery.id,
        session_id: session.id,
        created_at: delivery.created_at,
        latest_status: verdict?.status ?? null,
        delta_deg: verdict?.delta_deg ?? null,
        // Not in the real history select yet (repository.get_athlete_history
        // only asks for status/delta_deg/created_at) — see the comment on
        // DeliverySummary in ./types.ts.
        confidence: null,
        observed_knee_angle_deg: null,
        trunk_tilt_deg: null,
        actioned: remembered?.action ?? null,
        action_note: remembered?.note ?? null,
      };
    });

    return {
      id: session.id,
      athlete_id: athleteId,
      session_date: session.session_date,
      deliveries,
    };
  });
}

async function fetchReport(deliveryId: string): Promise<CoachingReport | null> {
  try {
    return await apiFetch<CoachingReport>(`/api/v1/reports/${deliveryId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export const api = {
  listAthletes: async (): Promise<Athlete[]> => {
    const dtos = await apiFetch<AthleteSummaryDto[]>('/api/v1/athletes');
    return dtos.map(toAthlete);
  },

  /** No single-athlete GET exists (src/coaching/routes/athletes.py has
   *  list/create/sessions/baseline/history, nothing by id) — fetch the
   *  list and find by id. */
  getAthlete: async (athleteId: string): Promise<Athlete | null> => {
    const dtos = await apiFetch<AthleteSummaryDto[]>('/api/v1/athletes');
    const found = dtos.find((a) => a.id === athleteId);
    return found ? toAthlete(found) : null;
  },

  /** POST .../sessions is a real, idempotent get-or-create-today's-session
   *  call (src/coaching/routes/athletes.py) — no request body needed. */
  startSession: (athleteId: string): Promise<SessionStartResult> =>
    apiFetch<SessionStartResult>(`/api/v1/athletes/${athleteId}/sessions`, { method: 'POST' }),

  /** Synchronous, not fire-and-forget - src/coaching/routes/deliveries.py's
   *  ingest_delivery returns the real CoachingReport directly, so the
   *  capture screen has a verdict the moment this resolves, no polling
   *  needed. Can throw ApiError with status 422 (ThermalThrottleError -
   *  too many deliveries too fast, PRD's thermal-throttle guard) or 403
   *  (ConsentRequiredError - consent revoked between session-pool
   *  selection and this POST). */
  submitDelivery: (payload: DeliveryIngestionRequest): Promise<CoachingReport> =>
    apiFetch<CoachingReport>('/api/v1/sessions/delivery', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAthleteHistory: (athleteId: string): Promise<SessionSummary[]> =>
    fetchAthleteHistory(athleteId),

  getReport: (deliveryId: string): Promise<CoachingReport | null> => fetchReport(deliveryId),

  /** Local-only — see action-memory.ts. Real gap: no action-readback
   *  endpoint exists on the backend at all. */
  getDeliveryAction: async (
    deliveryId: string,
  ): Promise<{ action: CoachActionType; note: string | null } | null> => {
    return recallAction(deliveryId);
  },

  /** No baseline GET exists either — the only place a confirmed baseline's
   *  median/IQR appears is embedded in a CoachingReport. Since only
   *  front_knee_angle_deg is ever scored (forward_trunk_tilt_deg is
   *  measured but never baselined — BACKEND_PLAN.md), this opportunistically
   *  reads it off the athlete's most recent *scored* delivery's report;
   *  for any other metric there is no path to a real number, so it's null. */
  getBaseline: async (athleteId: string, metric: string): Promise<BaselineRecord | null> => {
    if (metric !== 'front_knee_angle_deg') return null;

    const sessions = await fetchAthleteHistory(athleteId);
    const scored = sessions
      .flatMap((s) => s.deliveries)
      .filter(
        (d) =>
          d.latest_status !== null &&
          d.latest_status !== 'DATA_SUPPRESSED' &&
          d.latest_status !== 'BENCHMARK_PENDING',
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    if (!scored) return null;

    const report = await fetchReport(scored.id);
    if (!report || report.baselines.fixed_reference_median_deg === null) return null;

    return {
      athlete_id: athleteId,
      metric,
      median_deg: report.baselines.fixed_reference_median_deg,
      iqr_deg: report.baselines.fixed_reference_iqr_deg ?? 0,
      confirmed_by: null,
      confirmed_at: null,
    };
  },

  confirmBaseline: (
    athleteId: string,
    metric: string,
    medianDeg: number,
    iqrDeg: number,
    _confirmedBy: string,
  ): Promise<BaselineConfirmResult> =>
    apiFetch<BaselineConfirmResult>(`/api/v1/athletes/${athleteId}/baseline`, {
      method: 'POST',
      body: JSON.stringify({ metric, median_deg: medianDeg, iqr_deg: iqrDeg }),
    }),

  postCoachAction: async (
    deliveryId: string,
    action: CoachActionType,
    note: string | null,
    _coachId: string,
  ): Promise<CoachActionResult> => {
    const result = await apiFetch<CoachActionResult>(
      `/api/v1/deliveries/${deliveryId}/action`,
      { method: 'POST', body: JSON.stringify({ action, note }) },
    );
    // The backend has nowhere to read this back from later — remember it
    // locally so the UI reflects "already actioned" after a reload this
    // session. See action-memory.ts.
    rememberAction(deliveryId, { action, note });
    return result;
  },

  nudgeFfs: (deliveryId: string, frameDelta: number): Promise<CoachingReport> =>
    apiFetch<CoachingReport>(
      `/api/v1/deliveries/${deliveryId}/nudge-ffs?frame_delta=${frameDelta}`,
      { method: 'POST' },
    ),

  exportWhatsapp: (deliveryId: string): Promise<WhatsAppExportResult | null> =>
    apiFetch<WhatsAppExportResult>(`/api/v1/reports/${deliveryId}/export/whatsapp`),
};
