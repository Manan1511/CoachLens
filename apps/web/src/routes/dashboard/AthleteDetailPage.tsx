import { Link, useParams } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { AthleteMeta } from '@/components/dashboard/AthleteMeta';
import { BaselinePanel } from '@/components/dashboard/BaselinePanel';
import { DeltaTrendChart, type TrendPoint } from '@/components/dashboard/DeltaTrendChart';
import { SessionTimeline } from '@/components/dashboard/SessionTimeline';
import { api } from '@/lib/api/client';
import { useAsync } from '@/hooks/useAsync';
import { METRICS, METRIC_LABELS, type Athlete, type BaselineRecord, type SessionSummary } from '@/lib/api/types';
import { ageFromDob, formatDate } from '@/lib/stats';

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

export function AthleteDetailPage() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const { data, loading, error, reload } = useAsync(() => loadAthlete(athleteId!), [athleteId]);

  if (loading) return <p className="text-ink-dim">Loading athlete…</p>;
  if (error || !data) return <p className="text-status-red">Couldn't find that athlete.</p>;

  const { athlete, sessions, baselines } = data;
  const age = ageFromDob(athlete.dob);
  const isMinor = age !== null && age < 18;
  const kneeBaseline = baselines[METRICS.indexOf('front_knee_angle_deg')];

  return (
    <div>
      <Link to="/app" className="mb-md inline-block text-small text-ink-dim hover:text-ink">
        ← Roster
      </Link>

      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-h2">{athlete.name}</h1>
        {isMinor && (
          <Badge tone={athlete.guardian_consent ? 'accent' : 'yellow'}>
            {athlete.guardian_consent ? 'Guardian consent on file' : 'Guardian consent needed'}
          </Badge>
        )}
      </div>
      <div className="mb-lg">
        <AthleteMeta gender={athlete.gender} bowling_arm={athlete.bowling_arm} />
      </div>

      {kneeBaseline && (
        <section className="mb-lg">
          <h2 className="mb-sm text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">
            Trend — {METRIC_LABELS.front_knee_angle_deg}
          </h2>
          <DeltaTrendChart
            points={toTrendPoints(sessions)}
            // Matches the backend's outlier_threshold: max(3.2, 1.5 x IQR)
            // (src/interpretation/baseline.py) — kept in sync by hand.
            uncertaintyBand={Math.max(3.2, kneeBaseline.iqr_deg * 1.5)}
          />
        </section>
      )}

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

      <section>
        <h2 className="mb-sm text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">
          Sessions
        </h2>
        <SessionTimeline sessions={sessions} />
      </section>
    </div>
  );
}
