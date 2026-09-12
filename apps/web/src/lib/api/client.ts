import * as mock from './mock/handlers';
import type {
  Athlete,
  BaselineConfirmResult,
  BaselineRecord,
  CoachActionResult,
  CoachActionType,
  CoachingReport,
  SessionSummary,
} from './types';

/** The dashboard's only door to the backend. Every function today calls the
 *  in-memory mock (lib/api/mock/) because services/coaching-api has no
 *  list-athletes, no session-list, and no action-readback endpoint yet, and
 *  it's a moving target owned by someone else on the team right now.
 *
 *  When those endpoints exist, each function body below becomes a `fetch`
 *  against `/api/v1/...` with the coach's Supabase bearer token — the
 *  signatures and the types in ./types.ts already match the real contract,
 *  so no caller in routes/ or components/ needs to change. */

export const api = {
  listAthletes: (): Promise<Athlete[]> => mock.listAthletes(),

  getAthlete: (athleteId: string): Promise<Athlete | null> => mock.getAthlete(athleteId),

  getAthleteHistory: (athleteId: string): Promise<SessionSummary[]> =>
    mock.getAthleteHistory(athleteId),

  getReport: (deliveryId: string): Promise<CoachingReport | null> => mock.getReport(deliveryId),

  /** Mock-only — see the docstring on mock/handlers.ts's getDeliveryAction.
   *  Has no real endpoint to swap to yet. */
  getDeliveryAction: (deliveryId: string): Promise<CoachActionType | null> =>
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
};
