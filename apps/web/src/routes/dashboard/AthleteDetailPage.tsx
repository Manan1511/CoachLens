import { Link, useParams } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { BaselinePanel } from '@/components/dashboard/BaselinePanel';
import { SessionTimeline } from '@/components/dashboard/SessionTimeline';
import { api } from '@/lib/api/client';
import { useAsync } from '@/hooks/useAsync';
import { METRICS, METRIC_LABELS, type Athlete, type BaselineRecord, type SessionSummary } from '@/lib/api/types';
import { ageFromDob } from '@/lib/stats';

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

export function AthleteDetailPage() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const { data, loading, error, reload } = useAsync(() => loadAthlete(athleteId!), [athleteId]);

  if (loading) return <p className="text-ink-dim">Loading athlete…</p>;
  if (error || !data) return <p className="text-status-red">Couldn't find that athlete.</p>;

  const { athlete, sessions, baselines } = data;
  const age = ageFromDob(athlete.dob);
  const isMinor = age !== null && age < 18;

  return (
    <div className="mx-auto max-w-[42rem]">
      <Link to="/app" className="mb-md inline-block text-small text-ink-dim hover:text-ink">
        ← Roster
      </Link>

      <div className="mb-lg flex items-center gap-3">
        <h1 className="text-h2">{athlete.name}</h1>
        {isMinor && (
          <Badge tone={athlete.guardian_consent ? 'accent' : 'yellow'}>
            {athlete.guardian_consent ? 'Guardian consent on file' : 'Guardian consent needed'}
          </Badge>
        )}
      </div>

      <section className="mb-lg">
        <h2 className="mb-sm text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">
          Baseline
        </h2>
        <div className="flex flex-col gap-2">
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
