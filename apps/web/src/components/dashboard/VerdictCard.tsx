import { DeltaGauge } from './DeltaGauge';
import { StatusBadge } from './StatusBadge';
import type { Baselines, Verdict } from '@/lib/api/types';

/** The only thing visible on a delivery report when it first loads. Status,
 *  plain-language summary, and the clinical disclaimer — never optional,
 *  never collapsed away (CoachLens_PRD.md §1/§2). A typographic statement,
 *  not a bordered card — the page itself is the container.
 *
 *  The gauge sits here rather than behind "Show the evidence" — a coach
 *  should see where this delivery landed against the athlete's own baseline
 *  the instant the page loads, not only after opening the disclosure. It's
 *  omitted whenever there's nothing to compare (BENCHMARK_PENDING and
 *  DATA_SUPPRESSED both leave delta_deg null). */
export function VerdictCard({ verdict, baselines }: { verdict: Verdict; baselines?: Baselines }) {
  return (
    <div className="mb-md">
      <div className="mb-sm">
        <StatusBadge status={verdict.status} />
      </div>
      <p className="mb-md text-h3 leading-snug text-ink">{verdict.summary}</p>
      <p className="mb-md text-small text-ink-secondary">{verdict.clinical_disclaimer}</p>

      {baselines && baselines.delta_deg !== null && baselines.uncertainty_band_deg !== null && (
        <div>
          <p className="mb-1.5 text-caption text-ink-secondary">Delta from personal baseline</p>
          <DeltaGauge delta={baselines.delta_deg} band={baselines.uncertainty_band_deg} />
        </div>
      )}
    </div>
  );
}
