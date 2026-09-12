import { useState } from 'react';
import type { Baselines, Kinematics, Verdict } from '@/lib/api/types';
import { formatDeg } from '@/lib/stats';

const WINDOW_LABELS: Record<Verdict['window_pattern'], string> = {
  NOT_APPLICABLE: 'No window evaluated',
  ISOLATED: 'Isolated: does not repeat',
  '3_OF_5_MATCHED': '3 or more of the last 5 deliveries agree',
};

/** "Why was this flagged" — the numbers behind the headline. Collapsed by
 *  default everywhere except TECHNICAL_CONCERN, where the PRD's
 *  transparency requirement is load-bearing for a real coach decision.
 *  A plain disclosure, not a bordered panel — a top hairline is enough to
 *  separate it from the verdict above. */
export function EvidenceDisclosure({
  kinematics,
  baselines,
  verdict,
  defaultOpen,
}: {
  kinematics: Kinematics;
  baselines: Baselines;
  verdict: Verdict;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-line pt-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-small font-medium text-ink">Show the evidence</span>
        <span className="text-caption uppercase tracking-[0.08em] text-ink-secondary">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <div className="page-transition mt-md grid grid-cols-2 gap-x-md gap-y-3 text-small max-mobile:grid-cols-1">
          <Row label="Observed angle" value={formatDeg(kinematics.front_knee_angle_deg)} />
          <Row
            label="Confidence"
            value={
              kinematics.front_knee_confidence !== null
                ? `${Math.round(kinematics.front_knee_confidence * 100)}%`
                : '-'
            }
          />
          <Row label="FFS frame" value={kinematics.ffs_frame?.toString() ?? '-'} />
          <Row
            label="Filtered"
            value={
              kinematics.filtered === null
                ? '-'
                : kinematics.filtered
                  ? 'Yes (Butterworth)'
                  : 'No (raw keypoints)'
            }
          />
          <Row label="Personal baseline" value={formatDeg(baselines.fixed_reference_median_deg)} />
          <Row label="Baseline IQR" value={formatDeg(baselines.fixed_reference_iqr_deg)} />
          <Row label="Window pattern" value={WINDOW_LABELS[verdict.window_pattern]} />
          <Row label="Matches in window" value={String(verdict.window_matches)} />

          {verdict.trigger_context_deltas && verdict.trigger_context_deltas.length > 0 && (
            <div className="col-span-2 max-mobile:col-span-1">
              <p className="mb-1.5 text-ink-secondary">
                Contributing deltas: the rolling window behind "{WINDOW_LABELS[verdict.window_pattern]}"
              </p>
              <div className="flex flex-wrap gap-1.5">
                {verdict.trigger_context_deltas.map((d, i) => {
                  const band = baselines.uncertainty_band_deg;
                  const withinBand = band !== null ? Math.abs(d) <= band : null;
                  return (
                    <span
                      key={i}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium ${
                        withinBand === null
                          ? 'border-line text-ink-secondary'
                          : withinBand
                            ? 'border-status-green/30 text-status-green'
                            : 'border-status-red/30 text-status-red'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          withinBand === null
                            ? 'bg-ink-muted'
                            : withinBand
                              ? 'bg-status-green'
                              : 'bg-status-red'
                        }`}
                      />
                      {formatDeg(d)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-sm">
      <span className="text-ink-secondary">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
