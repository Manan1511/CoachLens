import { useState } from 'react';
import { api } from '@/lib/api/client';
import { useCoach } from '@/lib/auth/coach-auth';
import type { CoachActionType, ProposedAction } from '@/lib/api/types';

const QUICK_DISMISS_REASONS = ['Tactical variation', 'Slower ball', 'Yorker'];

/** Only ever rendered for TECHNICAL_CONCERN — MECHANICAL_WATCH is a
 *  replay-only yellow flag per CoachLens_PRD.md §8, no action menu at all.
 *  Approve accepts the proposed drill; contraindications are informational
 *  text only, never a clearance check (no athlete medical data is modeled).
 *
 *  `note` is a real field on the real POST .../action request
 *  (coaching/schemas/action.py's CoachActionRequest) that nothing in the
 *  dashboard collected until now — a coach's reason for dismissing a flag
 *  ("Tactical yorker", "Slower ball") is exactly the kind of pattern data
 *  worth keeping, and the backend already has somewhere to put it. */
export function ActionBar({
  deliveryId,
  action,
  actioned,
  actionNote,
  onActioned,
}: {
  deliveryId: string;
  action: ProposedAction;
  actioned: CoachActionType | null;
  actionNote: string | null;
  onActioned: () => void;
}) {
  const { coach } = useCoach();
  const [confirming, setConfirming] = useState<CoachActionType | null>(null);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);

  const startAction = (type: CoachActionType) => {
    setConfirming(type);
    setNote('');
  };

  const confirm = async () => {
    if (!coach || !confirming) return;
    setPending(true);
    try {
      await api.postCoachAction(deliveryId, confirming, note.trim() || null, coach.id);
      onActioned();
    } finally {
      setPending(false);
      setConfirming(null);
    }
  };

  return (
    <div className="border-t border-line pt-md">
      <p className="mb-1 text-small font-medium text-ink">{action.title}</p>
      <p className="mb-sm text-small text-ink-secondary">{action.prescription}</p>
      <p className="mb-sm text-caption text-ink-secondary">{action.credential}</p>

      {action.contraindications.length > 0 && (
        <p className="mb-md text-caption text-ink-secondary">
          Informational only, not a clearance check: {action.contraindications.join('; ')}
        </p>
      )}

      {actioned ? (
        <div>
          <p className="text-small font-medium text-ink">
            {actioned === 'APPROVE' ? 'Drill approved.' : 'Flag dismissed.'}
          </p>
          {actionNote && <p className="mt-0.5 text-caption text-ink-secondary">"{actionNote}"</p>}
        </div>
      ) : confirming ? (
        <div>
          {confirming === 'DISMISS' && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_DISMISS_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setNote(reason)}
                  className={`rounded-full border px-3 py-1 text-caption transition-colors ${
                    note === reason
                      ? 'border-line-strong bg-white/8 text-ink'
                      : 'border-line text-ink-secondary hover:text-ink'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          )}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={confirming === 'DISMISS' ? 'Reason (optional)' : 'Note (optional)'}
            className="mb-sm w-full rounded-md border border-line bg-canvas px-3 py-2 text-small text-ink outline-none focus-visible:border-line-strong"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={confirm}
              className="rounded-full bg-accent px-4 py-2 text-caption font-semibold text-canvas transition-opacity disabled:opacity-40"
            >
              {pending ? 'Saving…' : confirming === 'APPROVE' ? 'Confirm approve' : 'Confirm dismiss'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(null)}
              className="rounded-full border border-line px-4 py-2 text-caption font-semibold text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => startAction('APPROVE')}
            className="rounded-full bg-accent px-4 py-2 text-caption font-semibold text-canvas transition-opacity"
          >
            Approve drill
          </button>
          <button
            type="button"
            onClick={() => startAction('DISMISS')}
            className="rounded-full border border-line px-4 py-2 text-caption font-semibold text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
