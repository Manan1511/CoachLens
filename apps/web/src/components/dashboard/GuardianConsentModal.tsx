import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api/client';
import type { Athlete } from '@/lib/api/types';

export function GuardianConsentModal({
  athlete,
  isOpen,
  onClose,
  onConsentUpdated,
}: {
  athlete: Athlete | null;
  isOpen: boolean;
  onClose: () => void;
  onConsentUpdated: (updated: Athlete) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !athlete) return null;

  const requestText = `Hi, this is your cricket coach. We are setting up quantitative bowling mechanics reviews for ${athlete.name} using CoachLens.

Privacy Guarantees:
• Zero raw video is ever uploaded or stored on servers.
• Video pose analysis runs strictly on the coach's device in real time.
• Only numeric joint angles (e.g. knee flexion) are stored to monitor technique and fatigue.

Please reply with: "I consent to video pose analysis for ${athlete.name}" to confirm.`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(requestText)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(requestText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Unable to copy to clipboard.');
    }
  }

  async function handleConfirmConsent() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.updateAthleteConsent(athlete!.id, true);
      onConsentUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update consent.');
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-black/80 p-4 sm:p-6 backdrop-blur-md animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="animate-modal-panel relative my-auto w-full max-w-[30rem] rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-7 max-h-[calc(100vh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-modal-title"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="consent-modal-title" className="font-heading text-h3 font-medium text-ink">
              Guardian Consent
            </h2>
            <p className="mt-1 text-small text-ink-secondary">
              Parental authorization for <span className="text-ink font-medium">{athlete.name}</span>
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
          <div className="mb-4 rounded-lg border border-status-red/30 bg-status-red/10 px-3.5 py-2.5 text-small text-status-red">
            {error}
          </div>
        )}

        {/* Privacy summary */}
        <div className="mb-5 rounded-xl border border-line bg-canvas/70 p-4">
          <p className="text-caption font-semibold uppercase tracking-[0.08em] text-ink-secondary mb-2">
            Why is consent required?
          </p>
          <p className="text-small text-ink leading-relaxed">
            Under 18 bowlers require documented parental authorization before camera tracking can proceed.
            CoachLens enforces strict privacy safeguards:
          </p>
          <ul className="mt-2 space-y-1 text-caption text-ink-secondary">
            <li className="flex items-center gap-2">
              <span className="text-status-green">✓</span> Zero video uploaded: 100% on-device pose extraction
            </li>
            <li className="flex items-center gap-2">
              <span className="text-status-green">✓</span> Video frames are discarded immediately after joint detection
            </li>
            <li className="flex items-center gap-2">
              <span className="text-status-green">✓</span> Strictly coaching kinematics; not a medical diagnostic tool
            </li>
          </ul>
        </div>

        {/* Action 1: Send Request to Parent */}
        <div className="space-y-3 mb-6">
          <p className="text-caption font-semibold uppercase tracking-[0.08em] text-ink-secondary">
            Step 1: Request Consent from Guardian
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/28 bg-white/6 px-4 py-2.5 text-small font-medium text-ink transition-all hover:border-ink hover:bg-white/10"
            >
              <span>Share via WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-small font-medium text-ink-secondary transition-colors hover:border-ink hover:text-ink"
            >
              {copied ? 'Copied!' : 'Copy Notice Text'}
            </button>
          </div>
        </div>

        {/* Action 2: Confirm Consent Received */}
        <div className="border-t border-line pt-5">
          <p className="text-caption font-semibold uppercase tracking-[0.08em] text-ink-secondary mb-3">
            Step 2: Record Received Confirmation
          </p>
          <p className="text-caption text-ink-dim mb-4 leading-relaxed">
            Once you have received affirmative reply from the parent or guardian (via WhatsApp, email, or club paperwork), confirm it here to unblock video capture.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-5 py-2 text-small font-medium text-ink-secondary transition-colors hover:border-ink hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmConsent}
              className="rounded-full bg-accent px-6 py-2 text-small font-medium text-canvas transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-strong disabled:opacity-40"
            >
              {submitting ? 'Confirming…' : 'Confirm Consent on File'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
