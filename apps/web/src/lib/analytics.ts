import type { DeliveryStatus, DeliverySummary, SessionSummary } from '@/lib/api/types';

export interface SessionStats {
  total: number;
  byStatus: Partial<Record<DeliveryStatus, number>>;
  avgConfidence: number | null;
  /** "Drift detected" whenever the session contains a TECHNICAL_CONCERN —
   *  a coach-facing quick read, not a new backend concept: it's just a
   *  label over the same status breakdown. */
  verdict: 'Stable session' | 'Drift detected';
}

/** Per-session summary — total deliveries, a status breakdown, average
 *  confidence, and a one-line quick verdict. Confidence isn't in the real
 *  GET .../history response yet (see the comment on DeliverySummary in
 *  lib/api/types.ts) so this quietly returns null for it until that select
 *  is extended, rather than pretending a number exists. */
/** Shared by per-session stats, the athlete-level distribution bar, and the
 *  roster-wide overview strip — one place that counts deliveries by verdict
 *  status rather than three copies of the same loop. */
export function countByStatus(deliveries: DeliverySummary[]): Partial<Record<DeliveryStatus, number>> {
  const byStatus: Partial<Record<DeliveryStatus, number>> = {};
  for (const delivery of deliveries) {
    if (delivery.latest_status) {
      byStatus[delivery.latest_status] = (byStatus[delivery.latest_status] ?? 0) + 1;
    }
  }
  return byStatus;
}

export function computeSessionStats(deliveries: DeliverySummary[]): SessionStats {
  const byStatus = countByStatus(deliveries);
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const delivery of deliveries) {
    if (delivery.confidence !== null) {
      confidenceSum += delivery.confidence;
      confidenceCount += 1;
    }
  }

  return {
    total: deliveries.length,
    byStatus,
    avgConfidence: confidenceCount > 0 ? confidenceSum / confidenceCount : null,
    verdict: (byStatus.TECHNICAL_CONCERN ?? 0) > 0 ? 'Drift detected' : 'Stable session',
  };
}

export interface DataQualityStats {
  totalDeliveries: number;
  suppressedCount: number;
  suppressedPct: number | null;
  avgConfidence: number | null;
}

/** Rolled up across every session — "is the camera setup good enough" is an
 *  athlete-level question, not a single-session one. */
export function computeDataQuality(sessions: SessionSummary[]): DataQualityStats {
  const deliveries = sessions.flatMap((s) => s.deliveries);
  const suppressedCount = deliveries.filter((d) => d.latest_status === 'DATA_SUPPRESSED').length;
  const confidences = deliveries
    .map((d) => d.confidence)
    .filter((c): c is number => c !== null);

  return {
    totalDeliveries: deliveries.length,
    suppressedCount,
    suppressedPct: deliveries.length > 0 ? (suppressedCount / deliveries.length) * 100 : null,
    avgConfidence:
      confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null,
  };
}
