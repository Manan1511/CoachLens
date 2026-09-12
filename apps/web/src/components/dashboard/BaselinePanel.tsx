import { useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { useCoach } from '@/lib/auth/coach-auth';
import type { BaselineRecord } from '@/lib/api/types';
import { formatDeg, medianAndIqr } from '@/lib/stats';

/** Collapsed by default — current median/IQR only. Expanding opens the
 *  PRD's real workflow: median + IQR computed from a batch of un-fatigued
 *  benchmark readings (8-10 per the backend's docstring), not typed in
 *  directly, so the number a coach confirms is traceable to real deliveries. */
export function BaselinePanel({
  athleteId,
  metric,
  metricLabel,
  baseline,
  onConfirmed,
}: {
  athleteId: string;
  metric: string;
  metricLabel: string;
  baseline: BaselineRecord | null;
  onConfirmed: () => void;
}) {
  const { coach } = useCoach();
  const [open, setOpen] = useState(false);
  const [readingsText, setReadingsText] = useState('');
  const [saving, setSaving] = useState(false);

  const readings = useMemo(
    () =>
      readingsText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n)),
    [readingsText],
  );

  const preview = readings.length >= 2 ? medianAndIqr(readings) : null;

  const handleConfirm = async () => {
    if (!preview || !coach) return;
    setSaving(true);
    try {
      await api.confirmBaseline(athleteId, metric, preview.median, preview.iqr, coach.id);
      setReadingsText('');
      setOpen(false);
      onConfirmed();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="-mx-3 border-b border-line px-3 py-3.5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-small font-medium text-ink">{metricLabel}</p>
          <p className="text-caption text-ink-dim">
            {baseline
              ? `Baseline ${formatDeg(baseline.median_deg)} ± ${formatDeg(baseline.iqr_deg)} IQR`
              : 'No baseline confirmed yet'}
          </p>
        </div>
        <span className="text-caption uppercase tracking-[0.08em] text-ink-dim">
          {open ? 'Close' : baseline ? 'Update' : 'Confirm'}
        </span>
      </button>

      {open && (
        <div className="mt-md">
          <label className="mb-2 block text-small text-ink-secondary">
            Angle readings from 8–10 un-fatigued benchmark deliveries (comma or line separated)
          </label>
          <textarea
            value={readingsText}
            onChange={(e) => setReadingsText(e.target.value)}
            rows={3}
            placeholder="168.2, 167.9, 166.5, 169.0, 167.1..."
            className="mb-sm w-full rounded-md border border-line bg-canvas px-3 py-2 text-small text-ink outline-none focus-visible:border-line-strong"
          />

          {preview && (
            <p className="mb-sm text-small text-ink-secondary">
              From {readings.length} readings: median {formatDeg(preview.median)}, IQR{' '}
              {formatDeg(preview.iqr)}
            </p>
          )}

          <button
            type="button"
            disabled={!preview || saving}
            onClick={handleConfirm}
            className="rounded-full bg-accent px-4 py-2 text-caption font-semibold text-canvas transition-opacity disabled:opacity-40"
          >
            {saving ? 'Confirming…' : 'Confirm baseline'}
          </button>
        </div>
      )}
    </div>
  );
}
