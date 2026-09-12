import { useState } from 'react';
import { api } from '@/lib/api/client';

/** ± frame stepper to correct a mis-detected FFS frame — available on any
 *  delivery with a detected event frame, independent of verdict status
 *  (CoachLens_PRD.md §6.1/§8). Re-scoring inserts a new verdict row. */
export function NudgeFfsControl({
  deliveryId,
  currentFrame,
  onNudged,
}: {
  deliveryId: string;
  currentFrame: number;
  onNudged: () => void;
}) {
  const [pending, setPending] = useState(false);

  const nudge = async (delta: number) => {
    setPending(true);
    try {
      await api.nudgeFfs(deliveryId, delta);
      onNudged();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center justify-between border-t border-line py-md">
      <div>
        <p className="text-small font-medium text-ink">Nudge FFS frame</p>
        <p className="text-caption text-ink-secondary">Currently frame {currentFrame}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => nudge(-1)}
          aria-label="Shift FFS frame back by one"
          className="flex size-8 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-line-strong disabled:opacity-40"
        >
          −
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => nudge(1)}
          aria-label="Shift FFS frame forward by one"
          className="flex size-8 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-line-strong disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
