import * as mock from './mock/handlers';
import type {
  Athlete,
  BaselineConfirmResult,
  BaselineRecord,
  CoachActionResult,
  CoachActionType,
  CoachingReport,
  SessionStartResult,
  SessionSummary,
  WhatsAppExportResult,
} from './types';

/** The dashboard's only door to the backend. `listAthletes`/`getAthlete`
 *  mirror the real GET /api/v1/athletes now, and `exportWhatsapp` mirrors
 *  the real GET .../export/whatsapp — both call the in-memory mock only
 *  because it's a moving target owned by someone else on the team right
 *  now, not because the endpoints don't exist. `getAthleteHistory` and
 *  `getDeliveryAction` still stand in for real gaps (session-list and
 *  action-readback) — see the per-function notes below and in
 *  lib/api/mock/handlers.ts.
 *
 *  When it's time to point this at the real API, each function body below
 *  becomes a `fetch` against `/api/v1/...` with the coach's Supabase bearer
 *  token — the signatures and the types in ./types.ts already match the
 *  real contract, so no caller in routes/ or components/ needs to change. */

export const api = {
  listAthletes: (): Promise<Athlete[]> => mock.listAthletes(),

  getAthlete: (athleteId: string): Promise<Athlete | null> => mock.getAthlete(athleteId),

  startSession: (athleteId: string): Promise<SessionStartResult> => mock.startSession(athleteId),

  getAthleteHistory: (athleteId: string): Promise<SessionSummary[]> =>
    mock.getAthleteHistory(athleteId),

  getReport: (deliveryId: string): Promise<CoachingReport | null> => mock.getReport(deliveryId),

  /** Mock-only — see the docstring on mock/handlers.ts's getDeliveryAction.
   *  Has no real endpoint to swap to yet. */
  getDeliveryAction: (
    deliveryId: string,
  ): Promise<{ action: CoachActionType; note: string | null } | null> =>
    mock.getDeliveryAction(deliveryId),

  getBaseline: (athleteId: string, metric: string): Promise<BaselineRecord | null> =>
    mock.getBaseline(athleteId, metric),

  confirmBaseline: (
    athleteId: string,
    metric: string,
    medianDeg: number,
    iqrDeg: number,
    confirmedBy: string,
  ): Promise<BaselineConfirmResult> =>
    mock.confirmBaseline(athleteId, metric, medianDeg, iqrDeg, confirmedBy),

  postCoachAction: (
    deliveryId: string,
    action: CoachActionType,
    note: string | null,
    coachId: string,
  ): Promise<CoachActionResult> => mock.postCoachAction(deliveryId, action, note, coachId),

  nudgeFfs: (deliveryId: string, frameDelta: number): Promise<CoachingReport> =>
    mock.nudgeFfs(deliveryId, frameDelta),

  exportWhatsapp: (deliveryId: string): Promise<WhatsAppExportResult | null> =>
    mock.exportWhatsapp(deliveryId),
};
