import { useState } from 'react';
import { api } from '@/lib/api/client';
import { useCoach } from '@/lib/auth/mock-auth';
import type { CoachActionType, ProposedAction } from '@/lib/api/types';

/** Only ever rendered for TECHNICAL_CONCERN — MECHANICAL_WATCH is a
 *  replay-only yellow flag per CoachLens_PRD.md §8, no action menu at all.
 *  Approve accepts the proposed drill; contraindications are informational
 *  text only, never a clearance check (no athlete medical data is modeled). */
export function ActionBar({
  deliveryId,
  action,
  actioned,
  onActioned,
}: {
  deliveryId: string;
  action: ProposedAction;
  actioned: CoachActionType | null;
  onActioned: () => void;
}) {
  const { coach } = useCoach();
  const [pending, setPending] = useState<CoachActionType | null>(null);

  const act = async (type: CoachActionType) => {
    if (!coach) return;
    setPending(type);
    try {
      await api.postCoachAction(deliveryId, type, null, coach.id);
      onActioned();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-md border border-line-strong bg-surface p-md">
      <p className="mb-1 text-small font-medium text-ink">{action.title}</p>
      <p className="mb-sm text-small text-ink-secondary">{action.prescription}</p>
      <p className="mb-sm text-caption text-ink-dim">{action.credential}</p>

      {action.contraindications.length > 0 && (
        <p className="mb-md text-caption text-ink-dim">
          Informational only, not a clearance check — {action.contraindications.join('; ')}
        </p>
      )}

      {actioned ? (
        <p className="text-small font-medium text-ink">
          {actioned === 'APPROVE' ? 'Drill approved.' : 'Flag dismissed.'}
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => act('APPROVE')}
            className="rounded-full bg-accent px-4 py-2 text-caption font-semibold text-canvas transition-opacity disabled:opacity-40"
          >
            {pending === 'APPROVE' ? 'Approving…' : 'Approve drill'}
          </button>
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => act('DISMISS')}
            className="rounded-full border border-line px-4 py-2 text-caption font-semibold text-ink-secondary transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40"
          >
            {pending === 'DISMISS' ? 'Dismissing…' : 'Dismiss'}
          </button>
        </div>
      )}
    </div>
  );
}
