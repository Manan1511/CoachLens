import { AthleteCard } from '@/components/dashboard/AthleteCard';
import { api } from '@/lib/api/client';
import { useAsync } from '@/hooks/useAsync';
import type { Athlete, DeliveryStatus, SessionSummary } from '@/lib/api/types';

interface RosterRow {
  athlete: Athlete;
  lastSessionDate: string | null;
  latestStatus: DeliveryStatus | null;
}

async function loadRoster(): Promise<RosterRow[]> {
  const athletes = await api.listAthletes();
  const histories = await Promise.all(
    athletes.map((athlete) => api.getAthleteHistory(athlete.id)),
  );

  return athletes.map((athlete, i) => {
    const history: SessionSummary[] = histories[i];
    const lastSession = history[0];
    const lastDelivery = lastSession?.deliveries[lastSession.deliveries.length - 1];
    return {
      athlete,
      lastSessionDate: lastSession?.session_date ?? null,
      latestStatus: lastDelivery?.latest_status ?? null,
    };
  });
}

export function RosterPage() {
  const { data: rows, loading, error } = useAsync(loadRoster, []);

  return (
    <div>
      <h1 className="mb-xs text-h2">Roster</h1>
      <p className="mb-lg text-ink-secondary">Athletes across your sessions.</p>

      {loading && <p className="text-ink-dim">Loading roster…</p>}
      {error && <p className="text-status-red">Couldn't load the roster.</p>}

      {rows && (
        <div className="flex flex-col">
          {rows.map((row) => (
            <AthleteCard
              key={row.athlete.id}
              athlete={row.athlete}
              lastSessionDate={row.lastSessionDate}
              latestStatus={row.latestStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
