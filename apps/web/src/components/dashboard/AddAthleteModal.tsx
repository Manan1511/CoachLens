import { useState } from 'react';
import { api } from '@/lib/api/client';
import type { Athlete, BowlingArm } from '@/lib/api/types';

export function AddAthleteModal({
  isOpen,
  onClose,
  onAthleteCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAthleteCreated: (athlete: Athlete) => void;
}) {
  const [name, setName] = useState('');
  const [bowlingArm, setBowlingArm] = useState<BowlingArm>('RIGHT');
  const [guardianConsent, setGuardianConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter the athlete name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const athlete = await api.createAthlete({
        name: name.trim(),
        bowling_arm: bowlingArm,
        guardian_consent: guardianConsent,
      });
      setName('');
      setBowlingArm('RIGHT');
      setGuardianConsent(true);
      onAthleteCreated(athlete);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register athlete.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-md animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="animate-modal-panel w-full max-w-[28rem] rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 id="modal-title" className="font-heading text-h3 font-medium text-ink">
              Add Athlete
            </h2>
            <p className="mt-1 text-small text-ink-secondary">
              Register a new bowler to your coaching roster.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full border border-line text-ink-secondary transition-colors hover:border-ink hover:text-ink"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-status-red/30 bg-status-red/10 px-3.5 py-2.5 text-small text-status-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="athlete-name"
              className="mb-2 block text-caption font-semibold uppercase tracking-[0.08em] text-ink-secondary"
            >
              Player Name
            </label>
            <input
              id="athlete-name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Jasprit Bumrah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-line bg-canvas px-3.5 py-2.5 text-body text-ink placeholder:text-ink-dim outline-none transition-colors focus-visible:border-line-strong"
            />
          </div>

          <div>
            <label className="mb-2 block text-caption font-semibold uppercase tracking-[0.08em] text-ink-secondary">
              Bowling Arm
            </label>
            <div className="flex gap-1 rounded-full border border-line bg-canvas p-1">
              <button
                type="button"
                onClick={() => setBowlingArm('RIGHT')}
                className={`flex-1 rounded-full py-2 text-caption font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${
                  bowlingArm === 'RIGHT'
                    ? 'bg-white/10 text-ink shadow-sm'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                Right-arm
              </button>
              <button
                type="button"
                onClick={() => setBowlingArm('LEFT')}
                className={`flex-1 rounded-full py-2 text-caption font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${
                  bowlingArm === 'LEFT'
                    ? 'bg-white/10 text-ink shadow-sm'
                    : 'text-ink-secondary hover:text-ink'
                }`}
              >
                Left-arm
              </button>
            </div>
            <p className="mt-1.5 text-caption text-ink-dim">
              Determines front landing leg during sagittal tracking (right-arm lands on left leg).
            </p>
          </div>

          {/* Design system toggle control for guardian consent */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setGuardianConsent(!guardianConsent)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setGuardianConsent(!guardianConsent);
              }
            }}
            className="flex items-center justify-between gap-4 rounded-xl border border-line bg-canvas/70 p-4 transition-colors hover:border-line-strong cursor-pointer select-none"
          >
            <div className="flex-1 pr-2">
              <div className="flex items-center gap-2">
                <span className="text-small font-medium text-ink">
                  Guardian Consent Confirmed
                </span>
                {guardianConsent && (
                  <span className="rounded-full bg-status-green/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-status-green">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-caption leading-relaxed text-ink-secondary">
                Required for youth bowlers under 18 before recording or video pose analysis can proceed.
              </p>
            </div>

            {/* Accessible custom toggle switch */}
            <div
              role="switch"
              aria-checked={guardianConsent}
              aria-label="Guardian Consent Confirmed"
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 ease-smooth ${
                guardianConsent ? 'border-accent bg-accent' : 'border-line bg-surface'
              }`}
            >
              <span
                className={`inline-block size-4 rounded-full transition-transform duration-200 ease-smooth ${
                  guardianConsent ? 'translate-x-[22px] bg-canvas' : 'translate-x-[3px] bg-ink-dim'
                }`}
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-5 py-2 text-small font-medium text-ink-secondary transition-colors hover:border-ink hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-accent px-6 py-2 text-small font-medium text-canvas transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-strong disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {submitting ? 'Registering…' : 'Register Athlete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
