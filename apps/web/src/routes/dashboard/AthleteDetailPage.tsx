import { Link, useParams } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { AthleteMeta } from '@/components/dashboard/AthleteMeta';
import { BaselinePanel } from '@/components/dashboard/BaselinePanel';
import { DeltaTrendChart, type TrendPoint } from '@/components/dashboard/DeltaTrendChart';
import { FlagHistory } from '@/components/dashboard/FlagHistory';
import { SessionTimeline } from '@/components/dashboard/SessionTimeline';
import { api } from '@/lib/api/client';
import { computeDataQuality } from '@/lib/analytics';
import { useAsync } from '@/hooks/useAsync';
import { METRICS, METRIC_LABELS, type Athlete, type BaselineRecord, type SessionSummary } from '@/lib/api/types';
import { formatDate } from '@/lib/stats';

interface AthleteDetail {
  athlete: Athlete;
  sessions: SessionSummary[];
  baselines: (BaselineRecord | null)[];
}

async function loadAthlete(athleteId: string): Promise<AthleteDetail | null> {
  const athlete = await api.getAthlete(athleteId);
  if (!athlete) return null;

  const [sessions, baselines] = await Promise.all([
    api.getAthleteHistory(athleteId),
    Promise.all(METRICS.map((metric) => api.getBaseline(athleteId, metric))),
  ]);

  return { athlete, sessions, baselines };
}

/** Flattens sessions (newest-first, each with deliveries in capture order)
 *  into chronological trend points for the front-knee metric — the only
 *  one that's actually baselined and scored today. */
function toTrendPoints(sessions: SessionSummary[]): TrendPoint[] {
  return [...sessions]
    .reverse()
    .flatMap((session) =>
      session.deliveries.map((delivery) => ({
        date: formatDate(session.session_date),
        delta: delivery.delta_deg,
        status: delivery.latest_status,
      })),
    );
}

/** Three columns above `lg`: the athlete's identity pinned left, their trend
 *  chart pinned right, and the baseline/session data scrolling between them
 *  — `position: sticky` on the two side columns rather than a bounded-height
 *  overflow box, so it works with the page's normal scroll instead of
 *  needing a second, nested scrollbar. Below `lg` there's no room for three
 *  columns, so it falls back to the same stacked layout as every other
 *  dashboard page. */
export function AthleteDetailPage() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const { data, loading, error, reload } = useAsync(() => loadAthlete(athleteId!), [athleteId]);

  if (loading) return <p className="text-ink-dim">Loading athlete…</p>;
  if (error || !data) return <p className="text-status-red">Couldn't find that athlete.</p>;

  const { athlete, sessions, baselines } = data;
  const kneeBaseline = baselines[METRICS.indexOf('front_knee_angle_deg')];
  const quality = computeDataQuality(sessions);

  return (
    <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[14rem_1fr_18rem] lg:items-start lg:gap-8">
      {/* Left — identity, pinned */}
      <div className="mb-lg lg:sticky lg:top-28 lg:mb-0">
        <Link to="/app" className="mb-md inline-block text-small text-ink-dim hover:text-ink">
          ← Roster
        </Link>

        <h1 className="mb-1 text-h2 lg:text-h3">{athlete.name}</h1>
        {athlete.consent_blocked && (
          <Badge tone="yellow" className="mb-2">
            Guardian consent needed
          </Badge>
        )}
        <AthleteMeta gender={athlete.gender} bowling_arm={athlete.bowling_arm} />

        {quality.totalDeliveries > 0 && (
          <p className="mt-md text-caption text-ink-dim">
            {quality.suppressedPct !== null && (
              <>{Math.round(quality.suppressedPct)}% suppressed for low confidence</>
            )}
            {quality.avgConfidence !== null && (
              <> · {Math.round(quality.avgConfidence * 100)}% avg confidence overall</>
            )}
          </p>
        )}
      </div>

      {/* Middle — baseline, sessions, and flag history: this is what scrolls */}
      <div className="min-w-0">
        <section className="mb-lg">
          <h2 className="mb-1 text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">
            Baseline
          </h2>
          <div className="flex flex-col">
            {METRICS.map((metric, i) => (
              <BaselinePanel
                key={metric}
                athleteId={athlete.id}
                metric={metric}
                metricLabel={METRIC_LABELS[metric]}
                baseline={baselines[i]}
                onConfirmed={reload}
              />
            ))}
          </div>
        </section>

        <section className="mb-lg">
          <h2 className="mb-sm text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">
            Sessions
          </h2>
          <SessionTimeline sessions={sessions} />
        </section>

        <section>
          <h2 className="mb-1 text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">
            Flags & actions
          </h2>
          <FlagHistory sessions={sessions} />
        </section>
      </div>

      {/* Right — trend chart, pinned */}
      {kneeBaseline && (
        <div className="mt-lg lg:sticky lg:top-28 lg:mt-0">
          <h2 className="mb-sm text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">
            Trend — {METRIC_LABELS.front_knee_angle_deg}
          </h2>
          <DeltaTrendChart
            points={toTrendPoints(sessions)}
            // Matches the backend's outlier_threshold: max(3.2, 1.5 x IQR)
            // (src/interpretation/baseline.py) — kept in sync by hand.
            uncertaintyBand={Math.max(3.2, kneeBaseline.iqr_deg * 1.5)}
          />
        </div>
      )}
    </div>
  );
}
