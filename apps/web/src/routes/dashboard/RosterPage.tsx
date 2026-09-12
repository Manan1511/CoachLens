import { useState } from 'react';
import { AthleteCard } from '@/components/dashboard/AthleteCard';
import { StatusDistributionBar } from '@/components/dashboard/StatusDistributionBar';
import { AddAthleteModal } from '@/components/dashboard/AddAthleteModal';
import { api } from '@/lib/api/client';
import { countByStatus } from '@/lib/analytics';
import { useAsync } from '@/hooks/useAsync';
import type { Athlete, DeliveryStatus, SessionSummary } from '@/lib/api/types';

interface RosterRow {
  athlete: Athlete;
  lastSessionDate: string | null;
  latestStatus: DeliveryStatus | null;
  statusCounts: Partial<Record<DeliveryStatus, number>>;
}

/** Lower sorts first. The real GET /api/v1/athletes is name-ordered (it
 *  serves the capture app's session-pool picker, where alphabetical is the
 *  right call) — but a coach opening the dashboard wants to see who needs
 *  them first, not who comes first in the alphabet. This is a pure
 *  presentation choice over data the roster already has, not a new
 *  backend capability. */
const URGENCY: Record<DeliveryStatus, number> = {
  TECHNICAL_CONCERN: 0,
  MECHANICAL_WATCH: 1,
  BENCHMARK_PENDING: 2,
  DATA_SUPPRESSED: 3,
  FORM_BENCHMARK: 4,
};

async function loadRoster(): Promise<RosterRow[]> {
  const athletes = await api.listAthletes();
  const histories = await Promise.all(
    athletes.map((athlete) => api.getAthleteHistory(athlete.id)),
  );

  const rows = athletes.map((athlete, i) => {
    const history: SessionSummary[] = histories[i];
    const lastSession = history[0];
    const lastDelivery = lastSession?.deliveries[lastSession.deliveries.length - 1];
    return {
      athlete,
      lastSessionDate: lastSession?.session_date ?? null,
      latestStatus: lastDelivery?.latest_status ?? null,
      statusCounts: countByStatus(history.flatMap((s) => s.deliveries)),
    };
  });

  return rows.sort((a, b) => {
    const rank = (s: DeliveryStatus | null) => (s ? URGENCY[s] : 5);
    return rank(a.latestStatus) - rank(b.latestStatus) || a.athlete.name.localeCompare(b.athlete.name);
  });
}

export function RosterPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: rows, loading, error, reload } = useAsync(loadRoster, []);

  const needsReview =
    rows?.filter((r) => r.latestStatus === 'TECHNICAL_CONCERN' || r.latestStatus === 'MECHANICAL_WATCH')
      .length ?? 0;

  const latestStatusCounts = rows?.reduce<Partial<Record<DeliveryStatus, number>>>((counts, row) => {
    if (row.latestStatus) counts[row.latestStatus] = (counts[row.latestStatus] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <div className="mx-auto max-w-[42rem]">
      <div className="mb-lg flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-xs text-h2">Roster</h1>
          <p className="text-ink-secondary">
            {rows && rows.length > 0
              ? needsReview > 0
                ? `${needsReview} of ${rows.length} ${rows.length === 1 ? 'athlete needs' : 'athletes need'} a look, listed first below.`
                : `${rows.length} ${rows.length === 1 ? 'athlete' : 'athletes'}, all on baseline.`
              : 'Athletes across your sessions.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="shrink-0 flex items-center gap-1.5 rounded-full border border-white/28 bg-white/6 px-4 py-2 text-caption font-semibold uppercase tracking-[0.08em] text-ink transition-all duration-200 hover:border-ink hover:bg-white/10 hover:shadow-glow"
        >
          <span>+ Add Athlete</span>
        </button>
      </div>

      <AddAthleteModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAthleteCreated={() => {
          reload();
        }}
      />

      {latestStatusCounts && Object.keys(latestStatusCounts).length > 0 && (
        <div className="mb-lg">
          <p className="mb-1.5 text-caption font-bold uppercase tracking-[0.1em] text-ink-secondary">
            Team: latest verdict per athlete
          </p>
          <StatusDistributionBar counts={latestStatusCounts} />
        </div>
      )}

      {loading && <p className="text-ink-secondary">Loading roster…</p>}
      {error && <p className="text-status-red">Couldn't load the roster.</p>}

      {rows && (
        <div className="flex flex-col">
          {rows.map((row) => (
            <AthleteCard
              key={row.athlete.id}
              athlete={row.athlete}
              lastSessionDate={row.lastSessionDate}
              latestStatus={row.latestStatus}
              statusCounts={row.statusCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
